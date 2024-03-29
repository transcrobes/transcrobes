import { Component, createVNode, VNode } from "inferno";
import { connect } from "inferno-redux";
import _ from "lodash";
import type { RootState } from "../../../app/createStore";
import { addDefinitions } from "../../../features/definition/definitionsSlice";
import { DOMRectangle, setMouseover, setTokenDetails } from "../../../features/ui/uiSlice";
import {
  eventCoordinates,
  getNormalGloss,
  getWord,
  guessBetter,
  isNumberToken,
  isUnsure,
  syncDefs,
} from "../../../lib/componentMethods";
import { hasTones, toneColour } from "../../../lib/funclib";
import { affixCleaned, cleanedSound } from "../../../lib/libMethods";
import {
  AnyTreebankPosType,
  BOOK_READER_TYPE,
  DEFINITION_LOADING,
  DefinitionState,
  DefinitionType,
  EXTENSION_READER_TYPE,
  FontColourType,
  GLOSS_NUMBER_NOUNS,
  HasTextChildren,
  HasVNodeChildren,
  HtmlElement,
  MultipleChildren,
  ReaderState,
  SentenceType,
  KnownWords,
  SIMPLE_READER_TYPE,
  TokenType,
  UNSURE_ATTRIBUTE,
  USER_STATS_MODE,
  VIDEO_READER_TYPE,
} from "../../../lib/types";
import { ETFStylesProps } from "../../Common";

type EntryProps = {
  elementIds?: Set<string>;
  uniqueId: string;
  token: TokenType;
  readerConfig: ReaderState;
  sentence: SentenceType;
  classes: ETFStylesProps["classes"];
  clickable?: boolean;
  sameTab?: boolean;
};

type LocalEntryState = {
  gloss: string;
  charColours?: string[];
  nbRetries: number;
  unsure: boolean;
};

type StatedEntryProps = EntryProps & {
  glossToggled?: boolean;
  isKnown?: boolean;
  glossing?: number; // FIXME: type this!
  mouseover?: boolean;
  translationProviderOrder?: Record<string, number>;
  strictProviderOrdering?: boolean;
  fontColour?: FontColourType;
};

const RETRY_DEFINITION_MS = 5000;
const RETRY_DEFINITION_MAX_TRIES = 20;

function getBoundingClientRect(element: Element) {
  const { top, right, bottom, left, width, height, x, y } = element.getBoundingClientRect();
  return { top, right, bottom, left, width, height, x, y };
}

function sameCoordinates(element: Element, current: DOMRectangle) {
  const { width, height, x, y } = element.getBoundingClientRect();
  return width === current.width && height === current.height && x === current.x && y === current.y;
}

function doesNeedGloss(
  lexeme: string,
  knownWords: Partial<KnownWords>,
  readerConfig: ReaderState,
  pos?: AnyTreebankPosType,
  word?: string,
) {
  // FIXME: this should be configurable!
  if (!pos || readerConfig.glossing <= USER_STATS_MODE.NO_GLOSS) return false;

  const nonOptimisticKnows =
    lexeme in (knownWords.knownWordGraphs || {}) || (word || "") in (knownWords.knownWordGraphs || {});
  const optimisticKnows =
    lexeme.toLowerCase() in (knownWords.knownWordGraphs || {}) ||
    (word || "").toLowerCase() in (knownWords.knownWordGraphs || {}) ||
    nonOptimisticKnows;

  return !optimisticKnows && (GLOSS_NUMBER_NOUNS || !isNumberToken(pos));
}

class Entry extends Component<StatedEntryProps, LocalEntryState> {
  constructor(props: EntryProps, context: any) {
    super(props, context);
    this.state = {
      gloss: "",
      nbRetries: 0,
      unsure: false,
    };

    this.createPopover = this.createPopover.bind(this);
    this.createTokenDetails = this.createTokenDetails.bind(this);
    this.lookForDefinitionUpdate = this.lookForDefinitionUpdate.bind(this);
  }
  createTokenDetails(event: React.MouseEvent<HTMLSpanElement>): void {
    // directly open a new popup if:
    // - there isn't one already
    // - there is one and it is a different one
    // - unless on mobile, and then never directly open a new one (force closing existing one first)
    // The rationale for the mobile exception is that there is basically nowhere to click that isn't a
    // clickable space, so clicking outside should first get rid of the current popup, because most of
    // the time we *don't* actually want a new popup.
    if (this.props.token.de) {
      return;
    }
    if (
      !this.context.store.getState().ui.tokenDetails ||
      (!sameCoordinates(event.currentTarget, this.context.store.getState().ui.tokenDetails.sourceRect) &&
        window.screen.availWidth > 600)
    ) {
      if (this.props.clickable) {
        const destUrl = `${this.context.store.getState().userData.baseUrl}/#/notrobes?q=${this.props.token.l}`;
        if (this.props.sameTab) {
          // window.history.pushState(null, "", url); // this doesn't seem to get picked up by useLocation or useHistory
          window.location.href = destUrl;
        } else {
          window.open(destUrl);
        }
      } else {
        this.context.store.dispatch(setMouseover(undefined));
        this.context.store.dispatch(
          setTokenDetails({
            coordinates: eventCoordinates(event),
            token: this.props.token,
            sentence: this.props.sentence,
            gloss: !!this.state?.gloss,
            sourceRect: getBoundingClientRect(event.currentTarget),
          }),
        );
        event.stopPropagation();
        event.preventDefault();
      }
    } else {
      this.context.store.dispatch(setMouseover(undefined));
    }
  }

  async updates(readerConfig: ReaderState): Promise<void> {
    const rootState: RootState = this.context.store.getState();
    const knownWords = rootState.knownWords;
    const definitions = rootState.definitions;
    const tokenDetails = rootState.ui.tokenDetails;
    const {
      baseUrl,
      user: { fromLang, toLang },
    } = rootState.userData;

    const token = this.props.token;
    let localGloss = "";
    let needsGloss = false;
    let unsure = false;

    let def = token.id ? definitions[token.id] : await getWord(token.l);
    if (def) {
      def.glossToggled ??= false;
      let betterGuess: DefinitionType = def;
      let cleanGraph = affixCleaned(def.graph);
      if (hasTones(fromLang) && readerConfig.fontColour === "tones") {
        this.setState({ charColours: cleanedSound(def, fromLang).map((s) => toneColour(s)) });
      } else {
        this.setState({ charColours: undefined });
      }

      if (cleanGraph !== def.graph) {
        betterGuess = await guessBetter(def, fromLang, knownWords?.knownWordGraphs || {});
      }
      if (betterGuess.graph === def.graph) {
        needsGloss = doesNeedGloss(token.l, knownWords, readerConfig, token.pos, token.w);
        if ((needsGloss && (!def || !def.glossToggled)) || (!needsGloss && def && def.glossToggled)) {
          localGloss = await getNormalGloss(token, readerConfig, knownWords, definitions, fromLang, toLang);
        } else {
          localGloss = "";
        }
        if (localGloss && this.props.token.id) {
          if (isUnsure(def)) {
            unsure = true;
            betterGuess = await guessBetter(def, fromLang, knownWords?.knownWordGraphs || {});
          }
        }
      }

      if (betterGuess.graph !== def.graph) {
        unsure = !!isUnsure(betterGuess);
        if (!(betterGuess.id in definitions)) {
          this.context.store.dispatch(addDefinitions([{ ...betterGuess, glossToggled: false }]));
        }
        // fake POS - we don't know what the real one might be...
        needsGloss = doesNeedGloss(betterGuess.graph, knownWords, readerConfig, "NN");
        if (needsGloss) {
          const betterToken: TokenType = { l: betterGuess.graph, pos: "NN", w: betterGuess.graph, id: betterGuess.id };
          localGloss = await getNormalGloss(betterToken, readerConfig, knownWords, definitions, fromLang, toLang);
        } else {
          localGloss = "";
        }
      }
    } else {
      localGloss = DEFINITION_LOADING;
    }
    if (unsure) this.setState({ unsure });
    this.setState({ gloss: localGloss });

    if (tokenDetails) {
      this.context.store.dispatch(setTokenDetails({ ...tokenDetails, gloss: !!localGloss }));
    }
    if (localGloss.startsWith(DEFINITION_LOADING)) {
      syncDefs(baseUrl);
      window.setTimeout(this.lookForDefinitionUpdate, RETRY_DEFINITION_MS, {
        readerConfig: readerConfig,
        attemptsRemaining: RETRY_DEFINITION_MAX_TRIES,
      });
    }
  }

  lookForDefinitionUpdate({
    readerConfig,
    attemptsRemaining,
  }: {
    readerConfig: ReaderState;
    attemptsRemaining: number;
  }): void {
    const token = this.props.token;
    console.debug("Looking for definition update for", token.l);

    const {
      knownWords,
      definitions,
      userData: {
        baseUrl,
        user: { fromLang, toLang },
      },
    } = this.context.store.getState() as RootState;

    if (attemptsRemaining < 0) {
      this.setState({ gloss: " [Error loading gloss]" });
      return;
    }
    let promise: Promise<DefinitionState | null> | null;
    if (token.id && token.id.toString() in definitions) {
      promise = Promise.resolve(definitions[token.id.toString()]);
    } else {
      promise = getWord(token.l);
    }
    promise.then((def) => {
      if (!def) {
        syncDefs(baseUrl);
        window.setTimeout(this.lookForDefinitionUpdate, RETRY_DEFINITION_MS, {
          glossing: (readerConfig || this.props.readerConfig).glossing,
          attemptsRemaining: attemptsRemaining - 1,
        });
      } else {
        this.context.store.dispatch(addDefinitions([{ ...def, glossToggled: false }]));
        getNormalGloss(token, readerConfig || this.props.readerConfig, knownWords, definitions, fromLang, toLang).then(
          (gloss) => {
            // FIXME: how on earth does this happen??? Somehow this is getting called twice (even in prod mode)
            // and the second time the definition is undefined. I don't know why.
            if (!gloss.startsWith(DEFINITION_LOADING)) {
              this.setState({ gloss });
            } else {
              console.debug("Very strange, gloss bug", token.l, gloss, def);
            }
          },
        );
      }
    });
  }

  async componentWillUpdate(nextProps: StatedEntryProps, nextState: LocalEntryState, context: any): Promise<void> {
    if (this.props.token.pos || this.props.token.bg) {
      if (
        nextProps.glossToggled !== this.props.glossToggled ||
        nextProps.isKnown !== this.props.isKnown ||
        nextProps.strictProviderOrdering !== this.props.strictProviderOrdering ||
        nextProps.fontColour !== this.props.fontColour ||
        Object.keys(nextProps.translationProviderOrder || {}).join("") !==
          Object.keys(this.props.translationProviderOrder || {}).join("") ||
        nextProps.glossing !== this.props.glossing
      ) {
        await this.updates({
          ...this.props.readerConfig,
          glossing: nextProps.glossing !== undefined ? nextProps.glossing : this.props.readerConfig.glossing,
          translationProviderOrder:
            nextProps.translationProviderOrder || this.props.readerConfig.translationProviderOrder,
          strictProviderOrdering:
            nextProps.strictProviderOrdering !== undefined
              ? nextProps.strictProviderOrdering
              : this.props.readerConfig.strictProviderOrdering,
          fontColour: nextProps.fontColour !== undefined ? nextProps.fontColour : this.props.readerConfig.fontColour,
        });
      }
    }
  }

  async componentWillMount(): Promise<void> {
    if (this.props.token.pos || this.props.token.bg) {
      await this.updates(this.props.readerConfig);
    }
  }

  createPopover(event: React.MouseEvent<HTMLSpanElement> | undefined): void {
    if (this.props.mouseover && !this.props.token.de) {
      if (event) {
        const coordinates = eventCoordinates(event);
        this.context.store.dispatch(
          setMouseover({ coordinates, token: this.props.token, sentence: this.props.sentence }),
        );
        event.stopPropagation();
        event.preventDefault();
      } else {
        this.context.store.dispatch(setMouseover(undefined));
      }
    }
  }

  render(): VNode {
    const wordStyle: { [key: string]: string } = this.props.token.style || {};
    let returnNode: VNode;
    if (this.props.token.b) {
      wordStyle["padding-left"] = `${this.props.token.b.length * 0.25}em`;
    }
    if (this.props.token.pos || this.props.token.bg) {
      const vnodes: VNode[] = [];
      const graph = this.props.token.w || this.props.token.l;
      if (this.state?.charColours && this.state?.charColours.length > 0) {
        const charNodes: VNode[] = [];
        for (let i = 0; i < graph.length; i++) {
          charNodes.push(
            createVNode(
              HtmlElement,
              "span",
              `${this.props.classes.wordPinyinColours} tcrobe-word`,
              graph[i],
              HasTextChildren,
              { style: { ...wordStyle, color: this.state.charColours[i] } },
              null,
              null,
            ),
          );
        }
        vnodes.push(
          createVNode(
            HtmlElement,
            "span",
            "tcrobe-word",
            charNodes.filter((x) => x),
            MultipleChildren & HasVNodeChildren,
          ),
        );
      } else {
        vnodes.push(
          createVNode(
            HtmlElement,
            "span",
            `${this.props.classes.word} tcrobe-word`,
            graph,
            HasTextChildren,
            _.isEmpty(wordStyle) ? undefined : { style: wordStyle },
            null,
            null,
          ),
        );
      }
      if (this.state?.gloss) {
        vnodes.push(
          createVNode(
            HtmlElement,
            "span",
            `${this.props.classes.gloss} tcrobe-gloss`,
            `(${this.state?.gloss})`,
            HasTextChildren,
            this.props.readerConfig.glossUnsureBackgroundColour && this.state.unsure
              ? { [UNSURE_ATTRIBUTE]: "" }
              : null,
            null,
            null,
          ),
        );
      }
      returnNode = createVNode(
        HtmlElement,
        "span",
        this.props.classes.entry,
        vnodes.filter((x) => x),
        MultipleChildren & HasVNodeChildren,
        {
          onclick: this.createTokenDetails,
          onmouseenter: this.createPopover,
          onmouseleave: () => this.createPopover(undefined),
        },
      );
    } else {
      returnNode = createVNode(
        HtmlElement,
        "span",
        this.props.classes.word,
        this.props.token.l,
        HasTextChildren,
        _.isEmpty(wordStyle) ? undefined : { style: wordStyle },
        null,
        null,
      );
    }
    this.props.elementIds?.delete(this.props.uniqueId);
    return returnNode;
  }
}

function mapStateToProps(state: RootState, props: EntryProps) {
  let readerConfig: ReaderState;
  switch (props.readerConfig.readerType) {
    case BOOK_READER_TYPE:
      readerConfig = state.bookReader[props.readerConfig.id];
      break;
    case VIDEO_READER_TYPE:
      readerConfig = state.videoReader[props.readerConfig.id];
      break;
    case EXTENSION_READER_TYPE:
      readerConfig = state.extensionReader[props.readerConfig.id];
      break;
    case SIMPLE_READER_TYPE:
      readerConfig = state.simpleReader[props.readerConfig.id];
      break;
    default:
      throw new Error("Unknown readerType. This is bad!");
  }
  if (!readerConfig) {
    console.warn(props.readerConfig.id, state.videoReader, state.videoReader[props.readerConfig.id]);
    throw new Error("There is somehow no readerConfig");
  }
  return {
    glossToggled: props.token.id ? state.definitions[props.token.id]?.glossToggled : undefined,
    isKnown: props.token.l in (state.knownWords.knownWordGraphs || {}),
    glossing: readerConfig.glossing,
    mouseover: readerConfig.mouseover,
    translationProviderOrder: readerConfig.translationProviderOrder,
    strictProviderOrdering: readerConfig.strictProviderOrdering,
    fontColour: readerConfig.fontColour,
  };
}

export default connect(mapStateToProps)(Entry);
