import { Component, createTextVNode, createVNode, VNode } from "inferno";
import { connect } from "inferno-redux";
import _ from "lodash";
import type { RootState } from "../../../app/createStore";
import { addDefinitions } from "../../../features/definition/definitionsSlice";
import { DOMRectangle, setMouseover, setTokenDetails } from "../../../features/ui/uiSlice";
import { eventCoordinates, getNormalGloss, getWord, isNumberToken } from "../../../lib/componentMethods";
import {
  BOOK_READER_TYPE,
  DefinitionType,
  DEFINITION_LOADING,
  EXTENSION_READER_TYPE,
  GLOSS_NUMBER_NOUNS,
  HasTextChildren,
  HasVNodeChildren,
  HtmlElement,
  MultipleChildren,
  ReaderState,
  SentenceType,
  SIMPLE_READER_TYPE,
  TokenType,
  UNSURE_ATTRIBUTE,
  USER_STATS_MODE,
  VIDEO_READER_TYPE,
} from "../../../lib/types";
import { ETFStylesProps } from "../../Common";

type EntryProps = {
  token: TokenType;
  readerConfig: ReaderState;
  sentence: SentenceType;
  classes: ETFStylesProps["classes"];
  clickable?: boolean;
  sameTab?: boolean;
};

type LocalEntryState = {
  gloss: string;
  nbRetries: number;
};

type StatedEntryProps = EntryProps & {
  glossToggled?: boolean;
  isKnown?: boolean;
  glossing?: number; // FIXME: type this!
  mouseover?: boolean;
  translationProviderOrder?: Record<string, number>;
  strictProviderOrdering?: boolean;
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

class Entry extends Component<StatedEntryProps, LocalEntryState> {
  constructor(props: EntryProps, context: any) {
    super(props, context);
    this.state = {
      gloss: "",
      nbRetries: 0,
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
    const knownCards = rootState.knownCards;
    const definitions = rootState.definitions;
    const tokenDetails = rootState.ui.tokenDetails;
    const { fromLang, toLang } = rootState.userData.user;
    const token = this.props.token;

    // FIXME: this should be configurable!
    const nonOptimisticKnows =
      token.l in (knownCards.knownCardWordGraphs || {}) || (token.w || "") in (knownCards.knownCardWordGraphs || {});
    const optimisticKnows =
      token.l.toLowerCase() in (knownCards.knownCardWordGraphs || {}) ||
      (token.w || "").toLowerCase() in (knownCards.knownCardWordGraphs || {}) ||
      nonOptimisticKnows;

    const needsGloss =
      readerConfig.glossing > USER_STATS_MODE.NO_GLOSS &&
      !!token.pos &&
      !optimisticKnows &&
      (!isNumberToken(token) || GLOSS_NUMBER_NOUNS);

    const def = token.id ? definitions[token.id] : { ...(await getWord(token.l)), glossToggled: false };

    let localGloss = "";
    if ((needsGloss && (!def || !def.glossToggled)) || (!needsGloss && def && def.glossToggled)) {
      localGloss = await getNormalGloss(token, readerConfig, knownCards, definitions, fromLang, toLang);
    } else {
      localGloss = "";
    }
    this.setState({ gloss: localGloss });
    if (tokenDetails) {
      this.context.store.dispatch(setTokenDetails({ ...tokenDetails, gloss: !!localGloss }));
    }
    if (localGloss.startsWith(DEFINITION_LOADING)) {
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
      knownCards,
      definitions,
      userData: {
        user: { fromLang, toLang },
      },
    } = this.context.store.getState() as RootState;
    if (attemptsRemaining < 0) {
      this.setState({ gloss: " [Error loading gloss]" });
      return;
    }
    let promise: Promise<DefinitionType> | null;
    if (token.id && token.id.toString() in definitions) {
      promise = Promise.resolve(definitions[token.id.toString()]);
    } else {
      promise = getWord(token.l);
    }
    promise.then((def) => {
      if (!def) {
        window.setTimeout(this.lookForDefinitionUpdate, RETRY_DEFINITION_MS, {
          glossing: (readerConfig || this.props.readerConfig).glossing,
          attemptsRemaining: attemptsRemaining - 1,
        });
      } else {
        this.context.store.dispatch(addDefinitions([{ ...def, glossToggled: false }]));
        getNormalGloss(token, readerConfig || this.props.readerConfig, knownCards, definitions, fromLang, toLang).then(
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
        Object.keys(nextProps.translationProviderOrder || {}).join("") !==
          Object.keys(this.props.translationProviderOrder || {}).join("") ||
        nextProps.glossing !== this.props.glossing
      ) {
        await this.updates({
          ...this.props.readerConfig,
          glossing: nextProps.glossing || this.props.readerConfig.glossing,
          translationProviderOrder:
            nextProps.translationProviderOrder || this.props.readerConfig.translationProviderOrder,
          strictProviderOrdering: nextProps.strictProviderOrdering || this.props.readerConfig.strictProviderOrdering,
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
    let wordStyle: { [key: string]: string } = this.props.token.style || {};
    if (this.props.token.b) {
      wordStyle["padding-left"] = `${this.props.token.b.length * 0.25}em`;
    }

    if (this.props.token.pos || this.props.token.bg) {
      let isUnsure = false;
      if (this.props.readerConfig.glossUnsureBackgroundColour) {
        if (this.state?.gloss && this.props.token.id) {
          const def = this.context.store.getState().definitions[this.props.token.id] as DefinitionType;
          if (
            def &&
            def.providerTranslations.length > 0 &&
            def.providerTranslations.flatMap((pt) => (pt.provider !== "fbk" ? pt.posTranslations : [])).length === 0
          ) {
            isUnsure = true;
          }
        }
      }
      return createVNode(
        HtmlElement,
        "span",
        this.props.classes.entry,
        [
          createVNode(
            HtmlElement,
            "span",
            `${this.props.classes.word} tcrobe-word`,
            this.props.token.w || this.props.token.l,
            HasTextChildren,
            _.isEmpty(wordStyle) ? undefined : { style: wordStyle },
            null,
            null,
          ),
          this.state?.gloss &&
            createVNode(
              HtmlElement,
              "span",
              `${this.props.classes.gloss} tcrobe-gloss`,
              `(${this.state?.gloss})`,
              HasTextChildren,
              isUnsure ? { [UNSURE_ATTRIBUTE]: "" } : null,
              null,
              null,
            ),
        ].filter((x) => x),
        MultipleChildren & HasVNodeChildren,
        {
          onclick: this.createTokenDetails,
          onmouseenter: this.createPopover,
          onmouseleave: () => this.createPopover(undefined),
        },
      );
    } else {
      return createVNode(
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
    isKnown: props.token.l in (state.knownCards.knownCardWordGraphs || {}),
    glossing: readerConfig.glossing,
    mouseover: readerConfig.mouseover,
    translationProviderOrder: readerConfig.translationProviderOrder,
    strictProviderOrdering: readerConfig.strictProviderOrdering,
  };
}

export default connect(mapStateToProps)(Entry);
