import { Component, createVNode, VNode } from "inferno";
import { connect } from "inferno-redux";
import type { RootState } from "../../../app/createStore";
import { BOOK_READER_TYPE, SIMPLE_READER_TYPE, VIDEO_READER_TYPE } from "../../../features/content/contentSlice";
import { addDefinitions } from "../../../features/definition/definitionsSlice";
import { DOMRectangle, setMouseover, setTokenDetails } from "../../../features/ui/uiSlice";
import { eventCoordinates, getNormalGloss, getWord, isNumberToken } from "../../../lib/componentMethods";
import {
  DefinitionType,
  GLOSS_NUMBER_NOUNS,
  HasTextChildren,
  HasVNodeChildren,
  HtmlElement,
  MultipleChildren,
  ReaderState,
  SentenceType,
  TokenType,
  USER_STATS_MODE,
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

const DEFINITION_LOADING = "loading...";
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
    const fromLang = rootState.userData.user.fromLang;
    const token = this.props.token;
    const needsGloss =
      readerConfig.glossing > USER_STATS_MODE.NO_GLOSS &&
      !(token.l in knownCards.knownCardWordGraphs) &&
      !!token.pos &&
      (!isNumberToken(token) || GLOSS_NUMBER_NOUNS);

    const def = token.id ? definitions[token.id] : { ...(await getWord(token.l)), glossToggled: false };

    let localGloss = "";
    if ((needsGloss && (!def || !def.glossToggled)) || (!needsGloss && def && def.glossToggled)) {
      localGloss = await getNormalGloss(token, readerConfig, knownCards, definitions, fromLang || "zh-Hans");
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
    const {
      knownCards,
      definitions,
      userData: {
        user: { fromLang },
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
          glossing: readerConfig.glossing,
          attemptsRemaining: attemptsRemaining - 1,
        });
      } else {
        this.context.store.dispatch(addDefinitions([{ ...def, glossToggled: false }]));
        getNormalGloss(token, readerConfig, knownCards, definitions, fromLang || "zh-Hans").then((gloss) => {
          this.setState({ gloss });
        });
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
    if (this.props.token.pos || this.props.token.bg) {
      return createVNode(
        HtmlElement,
        "span",
        this.props.classes.entry,
        [
          createVNode(
            HtmlElement,
            "span",
            `${this.props.classes.word} tcrobe-word`,
            this.props.token.l,
            HasTextChildren,
            { style: this.props.token.style },
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
              null,
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
        null,
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
    case SIMPLE_READER_TYPE:
      readerConfig = state.simpleReader[props.readerConfig.id];
      break;
    default:
      throw new Error("Unknown readerType. This is bad!");
  }
  return {
    glossToggled: props.token.id ? state.definitions[props.token.id]?.glossToggled : undefined,
    isKnown: props.token.l in state.knownCards.knownCardWordGraphs,
    glossing: readerConfig.glossing,
    mouseover: readerConfig.mouseover,
    translationProviderOrder: readerConfig.translationProviderOrder,
    strictProviderOrdering: readerConfig.strictProviderOrdering,
  };
}

export default connect(mapStateToProps)(Entry);
