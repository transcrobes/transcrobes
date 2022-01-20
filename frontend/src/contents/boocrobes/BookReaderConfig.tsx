import { makeStyles } from "@material-ui/core";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { bookReaderActions, DEFAULT_BOOK_READER_CONFIG_STATE } from "../../features/content/bookReaderSlice";
import { ContentParams } from "../../lib/types";
import ReaderConfig from "../common/ReaderConfig";

const useStyles = makeStyles((theme) => ({
  [theme.breakpoints.up("sm")]: {
    buttonGroup: { padding: "0.3em", width: "100%" },
  },
  [theme.breakpoints.down("sm")]: {
    buttonGroup: { flexWrap: "wrap", padding: "0.3em", width: "100%" },
  },
  button: { width: "100%" },
}));

export default function BookReaderConfig(): React.ReactElement {
  const classes = useStyles();
  const { id } = useParams<ContentParams>();
  const readerConfig = useAppSelector((state) => state.bookReader[id] || { ...DEFAULT_BOOK_READER_CONFIG_STATE, id });
  const dispatch = useAppDispatch();

  return (
    <>
      <Conftainer label="Paging" id="paging">
        <ToggleButtonGroup
          className={classes.button}
          onChange={(event: React.MouseEvent<HTMLElement>, value: any) =>
            dispatch(bookReaderActions.setScroll({ id, value }))
          }
          value={readerConfig.isScrolling}
          exclusive
        >
          <ToggleButton className={classes.button} value={false}>
            Paginated
          </ToggleButton>
          <ToggleButton className={classes.button} value={true}>
            Scrolling
          </ToggleButton>
        </ToggleButtonGroup>
      </Conftainer>
      <ReaderConfig classes={classes} actions={bookReaderActions} readerConfig={readerConfig} />
    </>
  );
}
