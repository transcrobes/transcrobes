const language = localStorage.getItem("TCLang");

if (language) {
  // @ts-ignore
  window.nftts = {};

  const JSONparse = JSON.parse;
  const JSONstringify = JSON.stringify;

  JSON.parse = function () {
    // @ts-ignore
    const parsed = JSONparse.apply(this, arguments);
    if (parsed?.result?.timedtexttracks) {
      // @ts-ignore
      if (!window.nftts) window.nftts = {};
      const primary: any[] = [];
      const backup: any[] = [];
      for (const tt of parsed.result.timedtexttracks) {
        if (tt.rank > -1 && !tt.new_track_id?.endsWith(";1;1;0;"))
          if (tt.language === language) {
            const urls = tt.ttDownloadables["webvtt-lssdh-ios8"].urls;
            if (urls && urls.length > 1) {
              primary.push(tt);
            }
          } else if (tt.language?.split("-")?.[0] && tt.language?.split("-")?.[0] === language?.split("-")?.[0]) {
            // we might not have zh-Hans but might have zh-Hant, and we don't care which
            const urls = tt.ttDownloadables["webvtt-lssdh-ios8"].urls;
            if (urls && urls.length > 1) {
              backup.push(tt);
            }
          }
      }
      let best = primary.length > 0 ? primary : backup;
      if (best.length > 0) {
        best.sort((a, b) => {
          return b.ttDownloadables["webvtt-lssdh-ios8"].size - a.ttDownloadables["webvtt-lssdh-ios8"].size;
        });
        const urls = best[0].ttDownloadables?.["webvtt-lssdh-ios8"]?.urls;
        // @ts-ignore
        window.nftts[parsed.result.movieId] = [{ url: urls.at(0)?.url }, { url: urls.at(-1)?.url }];
      }
    }
    return parsed;
  };

  JSON.stringify = function (arg1) {
    if (typeof arg1 === "undefined") {
      // @ts-ignore
      return JSONstringify.apply(this, arguments);
    }

    // @ts-ignore
    const data = JSONparse(JSONstringify.apply(this, arguments));
    if (data?.params) {
      data.params.preferredTextLocale = language;
      data.params.showAllSubDubTracks = true;

      if (data.params.profiles) {
        data.params.profiles.push("webvtt-lssdh-ios8");
      }
      return JSONstringify(data);
    } else {
      // @ts-ignore
      return JSONstringify.apply(this, arguments);
    }
  };
}

export {};
