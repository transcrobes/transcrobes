import CloseIcon from "@mui/icons-material/Close";
import { CardHeader, Typography } from "@mui/material";
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
import { useTranslate } from "react-admin";
import { CalculatedContentValueStats, DOCS_DOMAIN, SystemLanguage } from "../lib/types";
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

interface Props extends CalculatedContentValueStats {
  fromLang: SystemLanguage;
}

export default function ContentValue(props: Props) {
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/content-value/`;
  const [open, setOpen] = React.useState(false);
  const translate = useTranslate();
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

  const foundWordTokens = props.unknownFoundWordsTotalTokens + props.knownFoundWordsTotalTokens;
  const notFoundWordTokens = props.unknownNotFoundWordsTotalTokens + props.knownNotFoundWordsTotalTokens;
  const foundRatioTokens = foundWordTokens / (foundWordTokens + notFoundWordTokens);
  const totalTokens = foundWordTokens + notFoundWordTokens;

  const foundWordTypes = props.unknownFoundWordsTotalTypes + props.knownFoundWordsTotalTypes;
  const notFoundWordTypes = props.unknownNotFoundWordsTotalTypes + props.knownNotFoundWordsTotalTypes;
  const foundRatioTypes = foundWordTypes / (foundWordTypes + notFoundWordTypes);
  const totalTypes = foundWordTypes + notFoundWordTypes;

  const unknownFoundWordsTotalTokensRatio = props.unknownFoundWordsTotalTokens / (foundWordTokens + notFoundWordTokens);

  function score() {
    // if (hasCharacters(props.fromLang)) {
    // }

    return `${(foundRatioTypes * 100).toFixed()}:${(foundRatioTokens * 100).toFixed()}:${(
      unknownFoundWordsTotalTokensRatio * 100
    ).toFixed()}`;
  }
  return (
    <>
      <Box
        title={translate("widgets.content_value_analysis.help_title")}
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
            minWidth: "70px",
          }}
          onClick={handleClickOpen}
        >
          {score()}
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
          <Typography marginRight={6}>{translate("widgets.content_value_analysis.title")}</Typography>
          <HelpButton url={helpUrl} />
        </DialogTitle>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <TableContainer component={Paper}>
            <Box sx={{ padding: "1em" }}>
              <Box component={"span"} sx={{ fontWeight: 700 }}>
                {translate("widgets.content_value_analysis.percent_useful_words")}
              </Box>
              : {(unknownFoundWordsTotalTokensRatio * 100).toFixed()}%
            </Box>
          </TableContainer>
          <TableContainer component={Paper}>
            <CardHeader title={translate("widgets.content_value_analysis.types")} />
            <Table aria-label="simple table">
              <TableBody>
                <TableRow>
                  <TableCell>{translate("widgets.content_value_analysis.header_items")}</TableCell>
                  <TableCell align="right">
                    {translate("widgets.content_value_analysis.header_unknown_total")}
                  </TableCell>
                  <TableCell align="right">{translate("widgets.content_value_analysis.header_ratio")}</TableCell>
                </TableRow>
              </TableBody>
              <TableBody>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_found")} ({format(foundWordTypes / totalTypes)}
                    )
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownFoundWordsTotalTypes} / {foundWordTypes}
                  </TableCell>
                  <TableCell align="right">{format(props.unknownFoundWordsTotalTypes / foundWordTypes)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_not_found")} (
                    {format(notFoundWordTypes / totalTypes)})
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownNotFoundWordsTotalTypes} / {notFoundWordTypes}
                  </TableCell>
                  <TableCell align="right">
                    {format(props.unknownNotFoundWordsTotalTypes / notFoundWordTypes)}
                  </TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_words")}
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownFoundWordsTotalTypes + props.unknownNotFoundWordsTotalTypes} / {totalTypes}
                  </TableCell>
                  <TableCell align="right">
                    {format((props.unknownFoundWordsTotalTypes + props.unknownNotFoundWordsTotalTypes) / totalTypes)}
                  </TableCell>
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
            <CardHeader title={translate("widgets.content_value_analysis.tokens")} />
            <Table aria-label="simple table">
              <TableBody>
                <TableRow>
                  <TableCell>{translate("widgets.content_value_analysis.header_items")}</TableCell>
                  <TableCell align="right">
                    {translate("widgets.content_value_analysis.header_unknown_total")}
                  </TableCell>
                  <TableCell align="right">{translate("widgets.content_value_analysis.header_ratio")}</TableCell>
                </TableRow>
              </TableBody>
              <TableBody>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_found")} (
                    {format(foundWordTokens / totalTokens)})
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownFoundWordsTotalTokens} / {foundWordTokens}
                  </TableCell>
                  <TableCell align="right">{format(props.unknownFoundWordsTotalTokens / foundWordTokens)}</TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_not_found")} (
                    {format(notFoundWordTokens / totalTokens)})
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownNotFoundWordsTotalTokens} / {notFoundWordTokens}
                  </TableCell>
                  <TableCell align="right">
                    {format(props.unknownNotFoundWordsTotalTokens / notFoundWordTokens)}
                  </TableCell>
                </TableRow>
                <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {translate("widgets.content_value_analysis.number_of_words")}
                  </TableCell>
                  <TableCell align="right">
                    {props.unknownFoundWordsTotalTokens + props.unknownNotFoundWordsTotalTokens} / {totalTokens}
                  </TableCell>
                  <TableCell align="right">
                    {format((props.unknownFoundWordsTotalTokens + props.unknownNotFoundWordsTotalTokens) / totalTokens)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={handleClose} startIcon={<CloseIcon />}>
            {translate("ra.action.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
