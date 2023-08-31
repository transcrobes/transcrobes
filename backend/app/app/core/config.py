import os
import secrets
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, PostgresDsn, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TRANSCROBES_LOG_LEVEL: str = "DEBUG"
    TRANSCROBES_DATA_LOG_LEVEL: str = "ERROR"
    TRANSCROBES_ENRICH_LOG_LEVEL: str = "ERROR"
    TRANSCROBES_ENRICHERS_LOG_LEVEL: str = "ERROR"
    TRANSCROBES_DEFAULT_LOG_LEVEL: str = "ERROR"

    @property
    def LOGGING(self):
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "verbose": {
                    "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
                    "style": "{",
                },
                "simple": {"format": "{levelname} {message}", "style": "{"},
            },
            "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "verbose"}},
            "loggers": {
                "app.data": {
                    "handlers": ["console"],
                    "level": self.TRANSCROBES_DATA_LOG_LEVEL,
                    "propagate": False,
                },
                "app.enrich": {
                    "handlers": ["console"],
                    "level": self.TRANSCROBES_ENRICH_LOG_LEVEL,
                    "propagate": False,
                },
                "app.zhhans": {
                    "handlers": ["console"],
                    "level": self.TRANSCROBES_ENRICHERS_LOG_LEVEL,
                    "propagate": False,
                },
                "app.zhhans_en": {
                    "handlers": ["console"],
                    "level": self.TRANSCROBES_ENRICHERS_LOG_LEVEL,
                    "propagate": False,
                },
                "": {
                    "handlers": ["console"],
                    "level": self.TRANSCROBES_DEFAULT_LOG_LEVEL,
                    "propagate": False,
                },
            },
        }

    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 30 days = 30 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    HA_HOST: str
    NODE_HOSTS: List[str]

    PER_DOMAIN: List[str] = None
    PER_DOMAIN_INTERNAL_PREFIX: str = "domain-specific"
    STATIC_ROOT: str = "../fapp"

    # BACKEND_CORS_ORIGINS is a JSON-formatted list of origins
    # e.g: '["http://localhost", "http://localhost:4200", "http://localhost:3000", \
    # "http://localhost:8080", "http://local.dockertoolbox.tiangolo.com"]'
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    TRACKING_KEY: Optional[Union[str, Literal[""]]] = "akey"
    TRACKING_ENDPOINT: Optional[Union[AnyHttpUrl, Literal[""]]] = "http://localhost/injest"

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        if isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    PROJECT_NAME: str = "Transcrobes"

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: Optional[int]
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    SQLALCHEMY_DATABASE_SYNC_URI: Optional[PostgresDsn] = None
    SQLALCHEMY_POOL_SIZE: int = 10
    SQLALCHEMY_POOL_MAX_OVERFLOW: int = 20

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql+psycopg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT', '5432')}/{values.get('POSTGRES_DB')}"

    @validator("SQLALCHEMY_DATABASE_SYNC_URI", pre=True)
    @classmethod
    def assemble_sync_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql+psycopg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT', '5432')}/{values.get('POSTGRES_DB')}"

    STATS_POSTGRES_SERVER: str
    STATS_POSTGRES_USER: str
    STATS_POSTGRES_PASSWORD: str
    STATS_POSTGRES_DB: str
    STATS_POSTGRES_PORT: Optional[int]
    STATS_SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    STATS_SQLALCHEMY_DATABASE_SYNC_URI: Optional[PostgresDsn] = None
    STATS_SQLALCHEMY_POOL_SIZE: int = 10
    STATS_SQLALCHEMY_POOL_MAX_OVERFLOW: int = 20

    @validator("STATS_SQLALCHEMY_DATABASE_URI", pre=True)
    @classmethod
    def stats_assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql+psycopg://{values.get('STATS_POSTGRES_USER')}:{values.get('STATS_POSTGRES_PASSWORD')}@{values.get('STATS_POSTGRES_SERVER')}:{values.get('STATS_POSTGRES_PORT', '5432')}/{values.get('STATS_POSTGRES_DB')}"

    @validator("STATS_SQLALCHEMY_DATABASE_SYNC_URI", pre=True)
    @classmethod
    def stats_assemble_sync_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql+psycopg://{values.get('STATS_POSTGRES_USER')}:{values.get('STATS_POSTGRES_PASSWORD')}@{values.get('STATS_POSTGRES_SERVER')}:{values.get('STATS_POSTGRES_PORT', '5432')}/{values.get('STATS_POSTGRES_DB')}"

    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    @validator("EMAILS_FROM_NAME")
    @classmethod
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if not v:
            return values["PROJECT_NAME"]
        return v

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_TEMPLATES_DIR: str = "/app/app/email-templates/build"
    EMAILS_ENABLED: bool = False

    @validator("EMAILS_ENABLED", pre=True)
    @classmethod
    def get_emails_enabled(cls, _v: bool, values: Dict[str, Any]) -> bool:
        return bool(values.get("SMTP_HOST") and values.get("SMTP_PORT") and values.get("EMAILS_FROM_EMAIL"))

    EMAIL_TEST_USER: EmailStr = "test@example.com"  # type: ignore
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    USERS_OPEN_REGISTRATION: bool = False

    DEBUG: bool = False
    MEDIA_ROOT: str = "/media/"
    DATA_ROOT: str = "/data/"
    LOCAL_DATA_ROOT: str = "/localdata/"

    BROADCASTER_MESSAGING_LAYER: str = "postgres"

    KAFKA_BROKER: str = "kafka:9092"
    KAFKA_CONSUMER_TIMEOUT_MS: int = 5000
    KAFKA_STATS_LOOP_SLEEP_SECS: int = 10
    KAFKA_MAX_POLL_RECORDS: int = 500

    FAUST_HOST: str = "faustworker"
    FAUST_PRODUCER_MAX_REQUEST_SIZE: int = 10000000  # default is 1MB, which is small for us
    CONSUMER_MAX_FETCH_SIZE: int = 10000000  # default is 1MB, which is small for us

    @property
    def DB_CACHE_DIR(self) -> str:
        return os.path.join(self.MEDIA_ROOT, "db_cache")

    @property
    def DEFINITIONS_CACHE_DIR(self) -> str:
        return os.path.join(self.MEDIA_ROOT, "definitions_json")

    DEFINITIONS_PER_CACHE_FILE: int = 5000

    @property
    def HANZI_CACHE_DIR(self) -> str:
        return os.path.join(self.MEDIA_ROOT, "hanzi_json")

    HANZI_PER_CACHE_FILE: int = 1000
    HANZI_WRITER_DATA_FILE: str = "data/all.json"
    HANZI_WRITER_DATA_REPO: str = "chanind/hanzi-writer-data"
    MAKE_ME_A_HANZI_DATA_FILE: str = "dictionary.txt"
    MAKE_ME_A_HANZI_DATA_REPO: str = "skishore/makemeahanzi"

    # User list import max file size in KB
    IMPORT_MAX_UPLOAD_SIZE_KB: int = 5120
    IMPORT_UPLOAD_SAFETY_MARGIN: int = 10000

    DATA_UPLOAD_MAX_MEMORY_SIZE: int = 5 * 1024 * 1024
    DATA_UPLOAD_MAX_MEMORY_SIZE = (
        IMPORT_MAX_UPLOAD_SIZE_KB * 1024
        if IMPORT_MAX_UPLOAD_SIZE_KB * 1024 > DATA_UPLOAD_MAX_MEMORY_SIZE
        else DATA_UPLOAD_MAX_MEMORY_SIZE
    ) + IMPORT_UPLOAD_SAFETY_MARGIN

    # The max size of a a chunk of an input/import file to send to the parser (CoreNLP)
    # This needs to be measured against resources, and the larger the chunk, the more memory and time
    # each chunk will require to process. Also:
    # - the CORENLP_TIMEOUT might need to be increased if this is increased
    # - the max number of bytes currently supported by the transcrobes/corenlp-chinese image is
    #   100k, the image will need to have -maxCharLength -1 (for unlimited) or -maxCharLength ??? if more is required
    # WARNING!!! corenlp should have at least 2GB of mem or large values here can quickly overwhelm it, and it
    # will start timing out and having regular OOM
    IMPORT_PARSE_CHUNK_SIZE_BYTES: int = 20000
    IMPORT_DETECT_CHUNK_SIZE_BYTES: int = 5000
    IMPORT_MAX_CONCURRENT_PARSER_QUERIES: int = 10

    OPENAI_API_KEY: str = "a_good_key"
    OPENAI_PROMPT_VERSION: int = 3

    # TODO: give the option of doing an import to a configmap mounted file
    # and configuring from there. That will likely be useful when we have
    # proper drop-in language pairs

    BING_API_HOST: str = "api.cognitive.microsofttranslator.com"
    BING_SUBSCRIPTION_KEY: str = "a_good_key"
    BING_TRANSLITERATOR_INMEM: bool = False
    BING_TRANSLATOR_INMEM: bool = False

    ZH_EN_CEDICT_PATH: str = "/data/zh_en_cedict.txt"
    ZH_EN_ABC_DICT_PATH: str = "/data/zh_en_abc_dict.txt"
    ZH_HSK_LISTS_PATH: str = "/data/zh_hsk{}.txt"
    ZH_SUBTLEX_FREQ_PATH: str = "/data/zh_subtlex.utf8.txt"
    ZH_EN_CEDICT_INMEM: bool = False
    ZH_EN_ABC_DICT_INMEM: bool = False
    ZH_SUBTLEX_FREQ_INMEM: bool = False
    ZH_HSK_LISTS_INMEM: bool = False
    ZH_CORENLP_HOST: str = "corenlpzh:9001"

    EN_ZH_ABC_DICT_PATH: str = "/data/abc_en_zh_dict.txt"
    EN_SUBTLEX_FREQ_PATH: str = "/data/subtlex-en-us.utf8.txt"
    EN_CMU_DICT_PATH: str = "/data/cmudict-0.7b.txt"
    EN_ZH_ABC_DICT_INMEM: bool = False
    EN_SUBTLEX_FREQ_INMEM: bool = False
    EN_CMU_DICT_INMEM: bool = False
    EN_CORENLP_HOST: str = "corenlpen:9001"

    @property
    def ALL_HOSTS(self) -> List[str]:
        return [self.HA_HOST] + self.NODE_HOSTS

    @property
    def LANG_PAIRS(self):
        return {
            "en:zh-Hans": {
                "enrich": {"classname": "app.en.CoreNLP_EN_Enricher", "config": {}},
                "parse": {
                    "classname": "app.enrich.parse.HTTPCoreNLPProvider",
                    "config": {
                        "base_url": f"http://{self.EN_CORENLP_HOST}",
                        "params": '{"annotators":"lemma","outputFormat":"json"}',
                    },
                },
                "word_lemmatizer": {
                    "classname": "app.en.lemmatize.HTTPCoreNLPLemmatizer",
                    "config": {
                        "base_url": f"http://{self.EN_CORENLP_HOST}",
                        "params": '{"annotators":"lemma","outputFormat":"json"}',
                    },
                },
                "default": {
                    "classname": "app.enrich.translate.bing.BingTranslator",
                    "config": {
                        "from": "en",
                        "to": "zh-Hans",
                        "api_host": self.BING_API_HOST,
                        "api_key": self.BING_SUBSCRIPTION_KEY,
                        "inmem": self.BING_TRANSLATOR_INMEM,
                    },
                    "transliterator": {
                        "classname": "app.en.transliterate.cmu.CMU_EN_Transliterator",
                        "config": {
                            "path": self.EN_CMU_DICT_PATH,
                            "inmem": self.EN_CMU_DICT_INMEM,
                        },
                    },
                },
                "secondary": [
                    {
                        "classname": "app.en_zhhans.translate.abc.EN_ZHHANS_ABCDictTranslator",
                        "config": {
                            "config": {
                                "path": self.EN_ZH_ABC_DICT_PATH,
                                "inmem": self.EN_ZH_ABC_DICT_INMEM,
                            },
                        },
                    },
                ],
                "metadata": [
                    {
                        "classname": "app.en.metadata.subtlex.EN_SubtlexMetadata",
                        "config": {
                            "path": self.EN_SUBTLEX_FREQ_PATH,
                            "inmem": self.EN_SUBTLEX_FREQ_INMEM,
                        },
                    },
                ],
                "transliterate": {
                    "classname": "app.en.transliterate.cmu.CMU_EN_Transliterator",
                    "config": {
                        "path": self.EN_CMU_DICT_PATH,
                        "inmem": self.EN_CMU_DICT_INMEM,
                    },
                },
            },
            "zh-Hans:en": {
                "language_config": {
                    "max_word_length_chars": 10,
                },
                "enrich": {"classname": "app.zhhans.CoreNLP_ZHHANS_Enricher", "config": {}},
                "parse": {
                    "classname": "app.enrich.parse.HTTPCoreNLPProvider",
                    "config": {
                        "base_url": f"http://{self.ZH_CORENLP_HOST}",
                        "params": '{"annotators":"lemma","outputFormat":"json"}',
                    },
                },
                "word_lemmatizer": {
                    "classname": "app.enrich.lemmatize.no_op.NoOpWordLemmatizer",
                    "config": {},
                },
                "default": {
                    "classname": "app.enrich.translate.bing.BingTranslator",
                    "config": {
                        "from": "zh-Hans",
                        "to": "en",
                        "api_host": self.BING_API_HOST,
                        "api_key": self.BING_SUBSCRIPTION_KEY,
                        "inmem": self.BING_TRANSLATOR_INMEM,
                    },
                    "transliterator": {
                        "classname": "app.enrich.transliterate.bing.BingTransliterator",
                        "config": {
                            "from": "zh-Hans",
                            "to": "en",
                            "from_script": "Hans",
                            "to_script": "Latn",
                            "api_host": self.BING_API_HOST,
                            "api_key": self.BING_SUBSCRIPTION_KEY,
                            "inmem": self.BING_TRANSLITERATOR_INMEM,
                        },
                    },
                },
                "secondary": [
                    {
                        "classname": "app.zhhans_en.translate.abc.ZHHANS_EN_ABCDictTranslator",
                        "config": {
                            "path": self.ZH_EN_ABC_DICT_PATH,
                            "inmem": self.ZH_EN_ABC_DICT_INMEM,
                        },
                    },
                    {
                        "classname": "app.zhhans_en.translate.ccc.ZHHANS_EN_CCCedictTranslator",
                        "config": {
                            "path": self.ZH_EN_CEDICT_PATH,
                            "inmem": self.ZH_EN_CEDICT_INMEM,
                        },
                    },
                ],
                "metadata": [
                    {
                        "classname": "app.zhhans.metadata.hsk.ZH_HSKMetadata",
                        "config": {
                            "path": self.ZH_HSK_LISTS_PATH,
                            "inmem": self.ZH_HSK_LISTS_INMEM,
                        },
                    },
                    {
                        "classname": "app.zhhans.metadata.subtlex.ZH_SubtlexMetadata",
                        "config": {
                            "path": self.ZH_SUBTLEX_FREQ_PATH,
                            "inmem": self.ZH_SUBTLEX_FREQ_INMEM,
                        },
                    },
                ],
                "transliterate": {
                    "classname": "app.enrich.transliterate.bing.BingTransliterator",
                    "config": {
                        "from": "zh-Hans",
                        "to": "en",
                        "from_script": "Hans",
                        "to_script": "Latn",
                        "api_host": self.BING_API_HOST,
                        "api_key": self.BING_SUBSCRIPTION_KEY,
                        "inmem": self.BING_TRANSLITERATOR_INMEM,
                    },
                },
            },
        }

    class Config:
        case_sensitive = True


settings = Settings()

if settings.DEBUG:
    print("Settings:", settings)
