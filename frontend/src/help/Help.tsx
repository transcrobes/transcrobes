import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { CardHeader, SvgIcon, Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ReactElement } from "react";
import { Button as RAButton, Title, useTranslate } from "react-admin";
import { ADMIN_EMAILS, DOCS_DOMAIN, YOUTUBE_CHANNEL } from "../lib/types";
import { ReactComponent as DiscordIcon } from "../svg/Discord.svg";

export default function Help(): ReactElement {
  const translate = useTranslate();

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/home/`;
  return (
    <Card>
      <Title title={translate("pos.help")} />
      <CardHeader title="Transcrobes help centre" />
      <CardContent>
        <Typography style={{ padding: "1em" }}>
          The{" "}
          <a target="_blank" href={helpUrl}>
            Transcrobes information site
          </a>{" "}
          has user documentation for the Transcrobes platform.
        </Typography>
        <Typography style={{ padding: "1em" }}>
          There is a{" "}
          <RAButton
            size="medium"
            label="YouTube Channel"
            onClick={() => window.open(YOUTUBE_CHANNEL, "_blank")}
            children={<YouTubeIcon />}
          />
          and
          <RAButton
            size="medium"
            label="a playlist of walkthrough videos"
            onClick={() =>
              window.open(
                "https://www.youtube.com/watch?v=XwZNzFw51lA&list=PLTPZJRPrvkmFS0cJudwCSNs1vrpZu9vgV",
                "_blank",
              )
            }
            children={<YouTubeIcon />}
          />{" "}
          for all the major features of the software.
        </Typography>
        <Typography style={{ padding: "1em" }}>
          Connect with the Transcrobes community on
          <RAButton
            size="medium"
            label="Twitter"
            onClick={() => window.open("https://twitter.com/transcrobes", "_blank")}
            children={<TwitterIcon />}
          />
          or on
          <RAButton
            size="medium"
            label="Discord"
            onClick={() => window.open("https://discord.gg/4qVNVAEVWj", "_blank")}
            children={<SvgIcon component={DiscordIcon} viewBox="0 0 71 55" />}
          />
        </Typography>
        <Typography style={{ padding: "1em" }}>
          For anything not covered in the online documentation or for any comments, questions or suggestions about the
          software, theories or the research, please contact the Lead Researcher and developer, Anton Melser (
          {ADMIN_EMAILS.join(" or ")})
        </Typography>
        <Typography style={{ padding: "1em" }}>
          Transcrobes is also an active academic research project. The key aspects of the theory behind the software are
          outlined{" "}
          <a target="_blank" href={`//${DOCS_DOMAIN}/page/meaningful-io/intro/`}>
            here
          </a>
          .
        </Typography>
      </CardContent>
    </Card>
  );
}
