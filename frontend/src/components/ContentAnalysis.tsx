import CloseIcon from "@mui/icons-material/Close";
import { Card, CardContent, CardHeader, Typography, useTheme } from "@mui/material";
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
import _ from "lodash";
import * as React from "react";
import { useAppSelector } from "../app/hooks";
import { EXTENSION_READER_ID } from "../features/content/extensionReaderSlice";
import { DOCS_DOMAIN, PythonCounter } from "../lib/types";
import HelpButton from "./HelpButton";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<Element | null>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function sumit(pyCount: PythonCounter | undefined) {
  return Object.values(pyCount || {}).reduce((a, b) => a + b, 0);
}

function format(num: number) {
  return isNaN(num) ? "" : new Intl.NumberFormat("default", { style: "percent" }).format(num);
}

export default function ContentAnalysis() {
  const [open, setOpen] = React.useState(false);
  const [removed, setRemoved] = React.useState(false);
  const stats = useAppSelector((state) => state.stats);
  const readerConfig = useAppSelector((state) => state.extensionReader[EXTENSION_READER_ID]);

  const [knownChars, setKnownChars] = React.useState(0);
  const [chars, setChars] = React.useState(0);
  const [knownWords, setKnownWords] = React.useState(0);
  const [words, setWords] = React.useState(0);
  const [knownCharsTypes, setKnownCharsTypes] = React.useState(0);
  const [charsTypes, setCharsTypes] = React.useState(0);
  const [knownWordsTypes, setKnownWordsTypes] = React.useState(0);
  const [wordsTypes, setWordsTypes] = React.useState(0);
  const [medianLength, setMedianLength] = React.useState(0);

  const theme = useTheme();
  const [colour, setColour] = React.useState(theme.palette.success.main);

  React.useEffect(() => {
    const kc = sumit(stats.knownChars);
    const c = sumit(stats.chars);
    const kw = sumit(stats.knownWords);
    const w = sumit(stats.words);
    const kct = Object.keys(stats.knownChars).length;
    const ct = Object.keys(stats.chars).length;
    const kwt = Object.keys(stats.knownWords).length;
    const wt = Object.keys(stats.words).length;
    // FIXME: there is a more efficient way to do this
    const ml = _.mean(Object.entries(stats.sentenceLengths).flatMap(([x, y]) => Array(y).fill(parseInt(x)))) || 0;
    setKnownChars(kc);
    setChars(c);
    setKnownWords(kw);
    setWords(w);
    setKnownCharsTypes(kct);
    setCharsTypes(ct);
    setKnownWordsTypes(kwt);
    setWordsTypes(wt);
    setMedianLength(ml);
    if (kc / c < 0.7 || kw / w < 0.5 || ml > 40) {
      setColour(theme.palette.warning.main);
    } else if (kc / c < 0.8 || kw / w < 0.8 || ml > 30) {
      setColour(theme.palette.info.main);
    }
  }, [stats.chars, stats.knownChars, stats.knownWords, stats.sentenceLengths, stats.words]);

  function handleClickOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function score() {
    const charTypes = knownCharsTypes / charsTypes || 0;
    const wordTypes = knownWordsTypes / wordsTypes || 0;
    const charTokens = knownChars / chars || 0;
    const wordTokens = knownWords / words || 0;
    return `${(charTypes * 100).toFixed()}:${(wordTypes * 100).toFixed()}:${(charTokens * 100).toFixed()}:${(
      wordTokens * 100
    ).toFixed()}:${medianLength.toFixed()}`;
  }

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/brocrobes/`;
  const tr = readerConfig.analysisPosition === "top-right";
  const boxRadii = tr ? "0px 10px 0px 10px" : "10px 0px 10px 0px";
  const leftButtonRadii = tr ? "0px 0px 0px 10px" : "10px 0px 0px 0px";
  const rightButtonRadii = tr ? "0px 0px 10px 0px" : "0px 10px 0px 0px";
  const vertPosition = tr ? { top: 0 } : { bottom: 0 };
  return !removed ? (
    <Box
      style={{
        zIndex: 1000,
        position: "fixed",
        right: "0",
        ...vertPosition,
      }}
    >
      <Box
        style={{
          zIndex: 1000,
          borderRadius: boxRadii,
        }}
      >
        <Button
          variant="contained"
          style={{
            zIndex: 1000,
            backgroundColor: colour,
            borderRadius: leftButtonRadii,
            padding: "0px 6px 0px 6px",
            margin: 0,
          }}
          onClick={handleClickOpen}
        >
          {score()}
        </Button>
        <Button
          variant="contained"
          style={{
            zIndex: 1000,
            backgroundColor: colour,
            padding: "6px 4px 6px 4px",
            margin: 0,
            minWidth: 0,
            borderRadius: rightButtonRadii,
          }}
          onClick={() => setRemoved(true)}
        >
          <CloseIcon
            style={{
              padding: 0,
              margin: 0,
            }}
          />
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
        >
          <Typography marginRight={6}>Personalised analysis</Typography>
          <HelpButton url={helpUrl} />
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <CardHeader title="Different items (types)" />
            <Table aria-label="simple table">
              <TableBody>
                <TableRow>
                  <TableCell>Items</TableCell>
                  <TableCell align="right">Known / Total</TableCell>
                  <TableCell align="right">Ratio</TableCell>
                </TableRow>
              </TableBody>
              <TableBody>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of characters
                  </TableCell>
                  <TableCell align="right">
                    {knownCharsTypes} / {charsTypes}
                  </TableCell>
                  <TableCell align="right">{format(knownCharsTypes / charsTypes)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of words
                  </TableCell>
                  <TableCell align="right">
                    {knownWordsTypes} / {wordsTypes}
                  </TableCell>
                  <TableCell align="right">{format(knownWordsTypes / wordsTypes)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <TableContainer
            sx={{
              marginTop: "8px",
            }}
            component={Paper}
          >
            <CardHeader title="Items (tokens)" />
            <Table aria-label="simple table">
              <TableBody>
                <TableRow>
                  <TableCell>Items</TableCell>
                  <TableCell align="right">Known / Total</TableCell>
                  <TableCell align="right">Ratio</TableCell>
                </TableRow>
              </TableBody>
              <TableBody>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of characters
                  </TableCell>
                  <TableCell align="right">
                    {knownChars} / {chars}
                  </TableCell>
                  <TableCell align="right">{format(knownChars / chars)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of words
                  </TableCell>
                  <TableCell align="right">
                    {knownWords} / {words}
                  </TableCell>
                  <TableCell align="right">{format(knownWords / words)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Card
            sx={{
              marginTop: "8px",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box>
                  <Typography>Average sentence length (words)</Typography>
                </Box>
                <Box>
                  <Typography>{medianLength.toFixed(1)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleClose} startIcon={<CloseIcon />}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  ) : (
    <></>
  );
}
