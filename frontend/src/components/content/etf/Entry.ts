import { Component, createVNode, VNode } from "inferno";
import { connect } from "inferno-redux";
import { RootState } from "../../../app/createStore";
import { BOOK_READER_TYPE, SIMPLE_READER_TYPE, VIDEO_READER_TYPE } from "../../../features/content/contentSlice";
import { setMouseover, setTokenDetails } from "../../../features/ui/uiSlice";
import { eventCoordinates, getNormalGloss, getWord, isNumberToken } from "../../../lib/componentMethods";
import {
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
};

type LocalEntryState = {
  gloss: string;
  tokenDetailsShowing: boolean;
};

type StatedEntryProps = EntryProps & {
  glossToggled?: boolean;
  isKnown?: boolean;
  glossing?: number; // FIXME: type this!
  mouseover?: boolean;
};

class Entry extends Component<StatedEntryProps, LocalEntryState> {
  constructor(props: EntryProps, context: any) {
    super(props, context);
    this.state = {
      gloss: "",
      tokenDetailsShowing: false,
    };

    this.createPopover = this.createPopover.bind(this);
    this.createTokenDetails = this.createTokenDetails.bind(this);
  }
  createTokenDetails(event: React.MouseEvent<HTMLSpanElement>): void {
    let newTokenDetailsShowing = this.state?.tokenDetailsShowing;
    if (!this.context.store.getState().ui.tokenDetails) {
      newTokenDetailsShowing = false;
      this.setState({ tokenDetailsShowing: false });
    }
    if (
      !(this.context.store.getState().ui.tokenDetails && newTokenDetailsShowing) &&
      this.props.readerConfig.clickable
    ) {
      this.context.store.dispatch(setTokenDetails(undefined));
      const coordinates = eventCoordinates(event);
      this.context.store.dispatch(setMouseover(undefined));
      this.setState({ tokenDetailsShowing: true });
      this.context.store.dispatch(
        setTokenDetails({
          coordinates,
          token: this.props.token,
          sentence: this.props.sentence,
          gloss: !!this.state?.gloss,
        }),
      );
      event.stopPropagation();
      event.preventDefault();
    } else {
      this.setState({ tokenDetailsShowing: false });
    }
  }

  async updates(glossing: number): Promise<void> {
    const rootState: RootState = this.context.store.getState();
    const knownCards = rootState.knownCards;
    const definitions = rootState.definitions;
    const tokenDetails = rootState.ui.tokenDetails;
    const fromLang = rootState.userData.user.fromLang;
    const token = this.props.token;
    const needsGloss =
      glossing > USER_STATS_MODE.NO_GLOSS &&
      !(token.l in knownCards.knownCardWordGraphs) &&
      !!token.pos &&
      (!isNumberToken(token) || GLOSS_NUMBER_NOUNS);

    const def = token.id ? definitions[token.id] : { ...(await getWord(token.l)), glossToggled: false };

    let localGloss = "";
    if ((needsGloss && (!def || !def.glossToggled)) || (!needsGloss && def && def.glossToggled)) {
      localGloss = await getNormalGloss(token, glossing, knownCards, definitions, fromLang || "zh-Hans");
    } else {
      localGloss = "";
    }
    this.setState({ gloss: localGloss });
    if (tokenDetails) {
      this.context.store.dispatch(setTokenDetails({ ...tokenDetails, gloss: !!localGloss }));
    }
  }

  async componentWillUpdate(nextProps: StatedEntryProps, nextState: LocalEntryState, context: any): Promise<void> {
    if (
      nextProps.glossToggled !== this.props.glossToggled ||
      nextProps.isKnown !== this.props.isKnown ||
      nextProps.glossing !== this.props.glossing
    ) {
      await this.updates(nextProps.glossing || this.props.readerConfig.glossing);
    }
  }

  async componentWillMount(): Promise<void> {
    await this.updates(this.props.readerConfig.glossing);
  }

  createPopover(event: React.MouseEvent<HTMLSpanElement> | undefined): void {
    if (this.props.mouseover) {
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
            this.props.token.style,
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
  };
}

export default connect(mapStateToProps)(Entry);
