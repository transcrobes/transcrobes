import CloseIcon from "@mui/icons-material/Close";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
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
import * as React from "react";
import { CalculatedContentStats, DOCS_DOMAIN } from "../lib/types";
import HelpButton from "./HelpButton";

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

interface Props extends CalculatedContentStats {
  colour: string;
  leftButtonRadii: string;
  rightButtonRadii: string;
  boxRadii: string;
  showRemove: boolean;
  setRemoved: (removed: boolean) => void;
}

export default function ContentAnalysis(props: Props) {
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/content-stats/`;
  const [open, setOpen] = React.useState(false);
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

  function score() {
    const charTypes = props.knownCharsTypes / props.charsTypes || 0;
    const wordTypes = props.knownWordsTypes / props.wordsTypes || 0;
    const charTokens = props.knownChars / props.chars || 0;
    const wordTokens = props.knownWords / props.words || 0;
    return `${(charTypes * 100).toFixed()}:${(wordTypes * 100).toFixed()}:${(charTokens * 100).toFixed()}:${(
      wordTokens * 100
    ).toFixed()}:${props.meanSentenceLength ? props.meanSentenceLength.toFixed() : "?"}`;
  }

  return (
    <>
      <Box
        style={{
          zIndex: 1000,
          borderRadius: props.boxRadii,
        }}
      >
        <Button
          variant="contained"
          style={{
            zIndex: 1000,
            backgroundColor: props.colour,
            borderRadius: props.leftButtonRadii,
            padding: "0px 6px 0px 6px",
            margin: 0,
            minWidth: "120px",
          }}
          onClick={handleClickOpen}
        >
          {score()}
        </Button>
        {props.showRemove && (
          <Button
            variant="contained"
            style={{
              zIndex: 1000,
              backgroundColor: props.colour,
              padding: "6px 4px 6px 4px",
              margin: 0,
              minWidth: 0,
              borderRadius: props.rightButtonRadii,
            }}
            onClick={() => props.setRemoved(true)}
          >
            <CloseIcon
              style={{
                padding: 0,
                margin: 0,
              }}
            />
          </Button>
        )}
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
                    {props.knownCharsTypes} / {props.charsTypes}
                  </TableCell>
                  <TableCell align="right">{format(props.knownCharsTypes / props.charsTypes)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of words
                  </TableCell>
                  <TableCell align="right">
                    {props.knownWordsTypes} / {props.wordsTypes}
                  </TableCell>
                  <TableCell align="right">{format(props.knownWordsTypes / props.wordsTypes)}</TableCell>
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
                    {props.knownChars} / {props.chars}
                  </TableCell>
                  <TableCell align="right">{format(props.knownChars / props.chars)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    Number of words
                  </TableCell>
                  <TableCell align="right">
                    {props.knownWords} / {props.words}
                  </TableCell>
                  <TableCell align="right">{format(props.knownWords / props.words)}</TableCell>
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
                  <Typography>{props.meanSentenceLength ? props.meanSentenceLength.toFixed(1) : "N/A"}</Typography>
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
    </>
  );
}
