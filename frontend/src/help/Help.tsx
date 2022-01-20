import { CardHeader, Typography } from "@material-ui/core";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import { ReactElement } from "react";
import { Title, useTranslate } from "react-admin";

export default function Help(): ReactElement {
  const translate = useTranslate();
  return (
    <div>
      <Card>
        <Title title={translate("pos.help")} />
        <CardHeader title="Transcrobes help centre" />
        <CardContent>
          <Typography style={{ padding: "1em" }}>
            The{" "}
            <a target="_blank" href="https://transcrob.es/page/software/learn/home/">
              Transcrobes information site
            </a>{" "}
            has user documentation for the Transcrobes platform.
          </Typography>
          <Typography style={{ padding: "1em" }}>
            For anything not covered in the online documentation or for any comments, questions or suggestions about the
            software, theories or the research, please contant the Lead Researcher and developer, Anton Melser
            (anton@transcrob.es or anton.melser@my.cityu.edu.hk)
          </Typography>
          <Typography style={{ padding: "1em" }}>
            Transcrobes is also an active academic research project. The key aspects of the theory behind the software
            are outlined{" "}
            <a target="_blank" href="https://transcrob.es/page/meaningful-io/intro/">
              here
            </a>
            . There are also two video introductions on YouTube, available{" "}
            <a target="_blank" href="https://www.youtube.com/watch?v=NYGFL3ArQxs">
              here
            </a>{" "}
            and{" "}
            <a target="_blank" href="https://www.youtube.com/watch?v=UodaDI4XVf0">
              here
            </a>
            .
          </Typography>
          <Typography style={{ padding: "1em" }}>
            We are currently working on a forum and other social media to enable users to interact and share their
            learning stories. Please check back here for more information in the coming weeks!
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
