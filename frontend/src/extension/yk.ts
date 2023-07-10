import { toInteger } from "chinese-numbers-to-arabic";
import { StreamCategory, StreamDetails, STREAMER_DETAILS, Subtitle, StreamType } from "../lib/types";

export type YoukuSeason = {
  current: boolean;
  lastEpisodeVideoId: string;
  showId: string;
  showLongId: number;
  title: string;
};

export type YoukuRawData = {
  streamerId: string;
  seasonId: string;
  availableSeasons: YoukuSeason[];
  episodeTitle: string;
  seasonTitle: string;
  videoType: string;
  episode: number;
  category: string;
  infoStr: string;
  canonicalUrl: string;
  duration: number;
  subtitles: Subtitle[];
};

export function getRawYoukuData() {
  // @ts-ignore
  const videoPlayer = window.videoPlayer;
  // @ts-ignore
  const initialData = window.__INITIAL_DATA__;
  const mediaResource = videoPlayer?.context?.mediaData?.mediaResource;
  const show = mediaResource?.show;
  const streamerId = videoPlayer?.context?.config?.vid?.toString();
  const seasonId = show?.encodeid?.toString();
  const availableSeasons: YoukuSeason[] = (initialData?.data?.data?.nodes?.[0]?.nodes?.[2]?.data?.series || []).map(
    (x) => {
      return {
        current: x.current,
        lastEpisodeVideoId: x.lastEpisodeVideoId,
        showId: x.showId,
        showLongId: x.showLongId,
        title: x.title,
      };
    },
  );
  const episodeTitle = mediaResource?.title?.toString(); // "老友记 第四季 19"
  const seasonTitle: string | undefined = show?.title?.toString(); // "老友记 第四季"

  const videoType = show?.show_videotype;
  const episode: number = show?.stage || 0;
  const category = show?.showcategory?.toString();

  const infoStr = initialData.data?.data?.nodes?.[0]?.nodes?.[0]?.nodes?.[0]?.data?.introSubTitle?.toString();

  const canonicalUrl = (mediaResource?.video?.weburl || "").replace("http://", "https://");
  const duration = parseInt(mediaResource?.duration) || 0;
  const sub = videoPlayer?.context?.mediaData?.currentSubtitle;
  const subtitles = sub
    ? [
        {
          url: sub?.url?.replace("http://", "https://"),
          lang: sub?.code === "default" ? "zhe" : sub?.code === "guoyu" ? "zh-Hans" : sub?.code,
        },
      ]
    : undefined;

  return {
    streamerId,
    seasonId,
    availableSeasons,
    episodeTitle,
    seasonTitle,
    videoType,
    episode,
    category,
    infoStr,
    canonicalUrl,
    duration,
    subtitles,
  } as YoukuRawData;
}

export function getYoukuData(raw: YoukuRawData) {
  const {
    streamerId,
    seasonId,
    availableSeasons,
    episodeTitle,
    seasonTitle,
    videoType,
    episode,
    category,
    infoStr,
    canonicalUrl,
    duration,
    subtitles,
  } = raw;
  const seasonShortName = availableSeasons.filter((x) => x.showId === seasonId)[0]?.title || "";
  const seasonNumber = seasonShortName
    ? toInteger(seasonShortName) || parseInt(seasonShortName.trim().match(/\d+$/)?.[0] || "1")
    : 1;

  const streamType = ({ 预告片: "trailer", 正片: "full" }[videoType] || "unknown") as StreamType;
  const cat = ({ 电影: "movie", 电视剧: "series" }[category] || "unknown") as StreamCategory;

  // let cat: StreamCategory = streamType as StreamCategory;
  // In some cases they will put all the sequels as "seasons"
  // if (category !== "series" && availableSeasons.length > 0) {
  //   cat = "series";
  // }

  let showTitle = seasonTitle.trim();
  if (cat === "series") {
    showTitle = showTitle
      .replace(seasonShortName, "")
      .replace(/第.+季/, "")
      .replace(/第.+部/, "")
      .replace(RegExp(`S?${seasonNumber}$`), "")
      .trim();
  }

  let country: string = "";
  let year: number = 0;
  let seasonYear: number = 0;
  let showGenre: string = "";

  if (infoStr) {
    country = infoStr.split("·")[0];
    if (cat === "series") {
      seasonYear = parseInt(infoStr.split("·")[1]) || 0;
    }
    if (seasonNumber === 1) {
      // movies also have a seasonNumber === 1
      year = parseInt(infoStr.split("·")[1]) || 0;
    }
    showGenre = infoStr.split("·")[2];
  }

  const data: StreamDetails = {
    streamer: "youku",
    streamerId,
    canonicalUrl,
    duration,
    seasonTitle,
    seasonId,
    seasonYear,
    streamType,
    episode,
    episodeTitle,
    seasonNumber,
    seasonShortName,
    // showId, ???
    showTitle,
    country,
    year,
    showGenre,
    category: cat,
    language: STREAMER_DETAILS.youku.siteLang,
    subtitles,
  };
  return { data };
}
