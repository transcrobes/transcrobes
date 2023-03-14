from enum import Enum

from app.zhhans.metadata.hsk import ZH_HSKMetadata
from app.zhhans.metadata.subtlex import ZH_SubtlexMetadata
from app.zhhans_en.translate.abc import ZHHANS_EN_ABCDictTranslator
from app.zhhans_en.translate.ccc import ZHHANS_EN_CCCedictTranslator
from pydantic import BaseModel


class DataType(str, Enum):
    definitions = "definitions"
    characters = "characters"
    all = "all"


class RegenerationType(BaseModel):
    data_type: DataType
    fakelimit: int = -1


class SourceDataType(str, Enum):
    zh_en_abc_dict = "zh_en_abc_dict"
    zh_en_cedict = "zh_en_cedict"
    zh_hsk_lists = "zh_hsk_lists"
    zh_subtlex_freq = "zh_subtlex_freq"
    all = "all"


DATA_PROVIDERS = {
    "zh_en_abc_dict": ZHHANS_EN_ABCDictTranslator,
    "zh_en_cedict": ZHHANS_EN_CCCedictTranslator,
    "zh_hsk_lists": ZH_HSKMetadata,
    "zh_subtlex_freq": ZH_SubtlexMetadata,
}


class LoadSourceData(BaseModel):
    data_type: SourceDataType
    force_reload: bool = False
