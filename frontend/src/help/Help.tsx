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
      <Title title={translate("screens.main.help")} />
      <CardHeader title={translate("screens.help.title")} />
      <CardContent>
        <Typography style={{ padding: "1em" }}>
          {translate("screens.help.text_a")}
          {` `}
          <a target="_blank" href={helpUrl}>
            {translate("screens.help.text_b")}
          </a>{" "}
        </Typography>

        <Typography style={{ padding: "1em" }}>{translate("screens.help.text_c")}</Typography>
        <Typography style={{ padding: "1em" }}>
          <RAButton
            size="medium"
            label={translate("screens.help.youtube_channel")}
            onClick={() => window.open(YOUTUBE_CHANNEL, "_blank")}
            children={<YouTubeIcon />}
          />
          <RAButton
            size="medium"
            label={translate("screens.help.playlist")}
            onClick={() =>
              window.open(
                "https://www.youtube.com/watch?v=XwZNzFw51lA&list=PLTPZJRPrvkmFS0cJudwCSNs1vrpZu9vgV",
                "_blank",
              )
            }
            children={<YouTubeIcon />}
          />
        </Typography>

        <Typography style={{ padding: "1em" }}>{translate("screens.help.text_d")}</Typography>
        <Typography style={{ padding: "1em" }}>
          <RAButton
            size="medium"
            label="Twitter"
            onClick={() => window.open("https://twitter.com/transcrobes", "_blank")}
            children={<TwitterIcon />}
          />
          <RAButton
            size="medium"
            label="Discord"
            onClick={() => window.open("https://discord.gg/4qVNVAEVWj", "_blank")}
            children={<SvgIcon component={DiscordIcon} viewBox="0 0 71 55" />}
          />
        </Typography>
        <Typography style={{ padding: "1em" }}>
          {translate("screens.help.text_e")} ({ADMIN_EMAILS.join(" or ")})
        </Typography>
        <Typography style={{ padding: "1em" }}>
          {translate("screens.help.text_f")}{" "}
          <a target="_blank" href={`//${DOCS_DOMAIN}/page/meaningful-io/intro/`}>
            {translate("screens.help.text_g")}
          </a>
        </Typography>
      </CardContent>
    </Card>
  );
}
