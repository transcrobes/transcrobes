import CloseIcon from "@mui/icons-material/Close";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Slide from "@mui/material/Slide";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import { TransitionProps } from "@mui/material/transitions";
import { Box } from "@mui/system";
import jsonexport from "jsonexport/dist";
import * as React from "react";
import { downloadCSV } from "react-admin";
import { store } from "../app/createStore";
import { ensureDefinitionsLoaded } from "../lib/dictionary";
import { bestGuess, sumValues } from "../lib/libMethods";
import { AbstractWorkerProxy } from "../lib/proxies";
import { AnalysisAccuracy, DEFAULT_READER_CONFIG_STATE } from "../lib/types";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<Element | null>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function format(num: number) {
  return isNaN(num) ? "" : new Intl.NumberFormat("default", { style: "percent" }).format(num);
}

const jsonexportPromise = (wordStats: any) => {
  return new Promise((resolve, reject) => {
    jsonexport(wordStats, (err: Error, csv: string) => {
      if (err) reject(err);
      resolve(csv);
    });
  });
};

export default function ContentAnalysisAccuracy({
  accuracy,
  proxy,
}: {
  accuracy: AnalysisAccuracy;
  proxy: AbstractWorkerProxy;
}) {
  const [open, setOpen] = React.useState(false);
  const [allWords, setAllWords] = React.useState(0);
  const [foundWords, setFoundWords] = React.useState(0);
  const [notFoundWords, setNotFoundWords] = React.useState(0);
  const [foundWordsString, setFoundWordsString] = React.useState("");
  const [notFoundWordsString, setNotFoundWordsString] = React.useState("");

  const [knownFoundWords, setKnownFoundWords] = React.useState(0);
  const [knownNotFoundWords, setKnownNotFoundWords] = React.useState(0);

  const [allWordsT, setAllWordsT] = React.useState(0);
  const [knownFoundWordsT, setKnownFoundWordsT] = React.useState(0);
  const [foundWordsT, setFoundWordsT] = React.useState(0);
  const [notFoundWordsT, setNotFoundWordsT] = React.useState(0);
  const [knownNotFoundWordsT, setKnownNotFoundWordsT] = React.useState(0);

  const readerConfig = { ...DEFAULT_READER_CONFIG_STATE };

  function handleClickOpen(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setOpen(true);
    return false;
  }

  function handleClose(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setOpen(false);
    return false;
  }

  React.useEffect(() => {
    const nfw: { word: string; guess: string }[] = [];
    const nnfw: { word: string; guess: string }[] = [];
    ensureDefinitionsLoaded(
      proxy,
      Object.values(accuracy.allWords).map((a) => a[0]),
      store,
    ).then(() => {
      for (const [word, [wordId]] of Object.entries(accuracy.allWords)) {
        if (word in accuracy.foundWords) {
          nfw.push({ word, guess: "" });
        } else if (word in accuracy.notFoundWords) {
          const def = store.getState().definitions[wordId];
          if (def) {
            nnfw.push({ word, guess: bestGuess({ l: word, id: wordId }, def, "zh-Hans", readerConfig) });
          } else {
            nnfw.push({ word, guess: "" });
          }
        }
      }
      jsonexportPromise(nfw).then((json) => {
        setFoundWordsString(json as string);
      });
      jsonexportPromise(nnfw).then((json) => {
        setNotFoundWordsString(json as string);
      });
      // setNotFoundWordsString(encodeURIComponent(nnfw.join("\n")));
    });
    setAllWords(Object.keys(accuracy.allWords).length);
    setKnownFoundWords(Object.keys(accuracy.knownFoundWords).length);
    setFoundWords(Object.keys(accuracy.foundWords).length);
    setNotFoundWords(Object.keys(accuracy.notFoundWords).length);
    setKnownNotFoundWords(Object.keys(accuracy.knownNotFoundWords).length);

    setAllWordsT(Object.values(accuracy.allWords).reduce((a, b) => a + b[1], 0));
    setKnownFoundWordsT(sumValues(accuracy.knownFoundWords));
    setFoundWordsT(sumValues(accuracy.foundWords));
    setNotFoundWordsT(sumValues(accuracy.notFoundWords));
    setKnownNotFoundWordsT(sumValues(accuracy.knownNotFoundWords));
  }, [accuracy]);

  return (
    <>
      <Box
        style={{
          zIndex: 1000,
        }}
      >
        <Button
          variant="contained"
          style={{
            zIndex: 1000,
            padding: "0px 6px 0px 6px",
            margin: 0,
            minWidth: "120px",
          }}
          onClick={handleClickOpen}
        >
          Acc
        </Button>
      </Box>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="analysis-slide-description"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Typography marginRight={6}>Personalised analysis</Typography>
        </DialogTitle>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <TableContainer component={Paper}>
            <Table aria-label="simple table">
              <TableBody>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell align="right">Types</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
              <TableBody>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    All words
                  </TableCell>
                  {/* <TableCell align="right">{JSON.stringify(Object.entries(accuracy.allWords).slice(0, 10))}</TableCell> */}
                  <TableCell align="right">{allWords}</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right">{allWordsT}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    <Button onClick={() => downloadCSV(foundWordsString, "foundWords")}>foundWords</Button>
                  </TableCell>
                  {/* <TableCell align="right"> {JSON.stringify(Object.entries(accuracy.foundWords).slice(0, 10))} </TableCell> */}
                  <TableCell align="right">{foundWords}</TableCell>
                  <TableCell align="right">{format(foundWords / allWords)}</TableCell>
                  <TableCell align="right">{foundWordsT}</TableCell>
                  <TableCell align="right">{format(foundWordsT / allWordsT)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    <Button onClick={() => downloadCSV(notFoundWordsString, "notFoundWords")}>notFoundWords</Button>
                  </TableCell>
                  {/* <TableCell align="right"> {JSON.stringify(Object.entries(accuracy.notFoundWords).slice(0, 10))} </TableCell> */}
                  <TableCell align="right">{notFoundWords}</TableCell>
                  <TableCell align="right">{format(notFoundWords / allWords)}</TableCell>
                  <TableCell align="right">{notFoundWordsT}</TableCell>
                  <TableCell align="right">{format(notFoundWordsT / allWordsT)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    knownFoundWords
                  </TableCell>
                  {/* <TableCell align="right"> {JSON.stringify(Object.entries(accuracy.knownFoundWords).slice(0, 10))} </TableCell> */}
                  <TableCell align="right">{knownFoundWords}</TableCell>
                  <TableCell align="right">{format(knownFoundWords / allWords)}</TableCell>
                  <TableCell align="right">{knownFoundWordsT}</TableCell>
                  <TableCell align="right">{format(knownFoundWordsT / allWordsT)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    knownNotFoundWords
                  </TableCell>
                  {/* <TableCell align="right"> {JSON.stringify(Object.entries(accuracy.knownNotFoundWords).slice(0, 10))} </TableCell> */}
                  <TableCell align="right">{knownNotFoundWords}</TableCell>
                  <TableCell align="right">{format(knownNotFoundWords / allWords)}</TableCell>
                  <TableCell align="right">{knownNotFoundWordsT}</TableCell>
                  <TableCell align="right">{format(knownNotFoundWordsT / allWordsT)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleClose} startIcon={<CloseIcon />}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
