import { Box, Divider } from "@mui/material";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import useDecomposition from "../../../hooks/useDecomposition";
import { cleanedSound, shortProviderTranslations } from "../../../lib/libMethods";
import { InputLanguage, TokenType } from "../../../lib/types";
import DiscoverableWord from "../../DiscoverableWord";
import SoundBox from "../../SoundBox";

type Props = {
  token: TokenType;
  fromLang: InputLanguage;
};

export default function Substrings({ token, fromLang }: Props): ReactElement {
  const [decomp, subs] = useDecomposition(token.l);
  const translate = useTranslate();
  return decomp && subs ? (
    <Box sx={{ marginLeft: "6px", padding: "5px 0" }}>
      {token.l
        .split("")
        .map((d) => decomp.get(d))
        .filter((d) => !!d)
        .map((d, i) => (
          <div key={d!.graph + i}>
            <DiscoverableWord newTab graph={d!.graph} sound={cleanedSound(d!, fromLang)} />:{" "}
            {cleanedSound(d!, fromLang).map((s, index) => (
              <SoundBox key={`${s}${index}`} sound={s} index={index} />
            ))}
            : {shortProviderTranslations(d!, fromLang)}
          </div>
        ))}
      {subs.size > 0 ? (
        <>
          <Divider /> <span>{translate("widgets.subwords.title")}</span>
        </>
      ) : (
        <></>
      )}
      {[...subs.values()].map((d, i) => (
        <div key={d.graph + i}>
          <DiscoverableWord newTab graph={d.graph} sound={cleanedSound(d, fromLang)} />:{" "}
          {cleanedSound(d, fromLang).map((s, index) => (
            <SoundBox key={`${s}${index}`} sound={s} index={index} />
          ))}
          : {shortProviderTranslations(d, fromLang)}
        </div>
      ))}
    </Box>
  ) : (
    <></>
  );
}
