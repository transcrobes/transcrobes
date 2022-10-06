import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useParams } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import FivePercentFineControl from "../../components/FivePercentFineControl";
import { bookReaderActions } from "../../features/content/bookReaderSlice";
import { ContentParams, DEFAULT_BOOK_READER_CONFIG_STATE } from "../../lib/types";
import ReaderConfig from "../common/ReaderConfig";

const useStyles = makeStyles()((theme) => {
  return {
    [theme.breakpoints.up("sm")]: {
      buttonGroup: { padding: "0.3em", width: "100%" },
    },
    [theme.breakpoints.down("md")]: {
      buttonGroup: { flexWrap: "wrap" as const, padding: "0.3em", width: "100%" },
    },
    button: { width: "100%" },
    fineControlIcons: {
      color: "#777",
      fontSize: 20,
      transform: "scale(0.9)",
      "&:hover": {
        color: theme.palette.getContrastText(theme.palette.background.default),
        transform: "scale(1)",
      },
    },
  };
});

export default function BookReaderConfig(): React.ReactElement {
  const { classes } = useStyles();
  const { id = "" } = useParams<ContentParams>();
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
      <Conftainer label="Page Margins" id="pageMargins">
        <FivePercentFineControl
          onValueChange={(value) => {
            dispatch(bookReaderActions.setPageMargins({ id, value: value || 1 }));
          }}
          value={readerConfig.pageMargins}
          className={classes.fineControlIcons}
        />
      </Conftainer>
      <ReaderConfig classes={classes} actions={bookReaderActions} readerConfig={readerConfig} />
    </>
  );
}
