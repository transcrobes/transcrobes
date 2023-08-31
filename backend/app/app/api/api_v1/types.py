# -*- coding: utf-8 -*-

from __future__ import annotations

import copy
import dataclasses
import json
import re
from dataclasses import field
from typing import Generic, Optional, TypeVar

import strawberry
from app import models
from app.db.session import async_session
from app.etypes import KNOWLEDGE_UNSET
from app.models.mixins import ActivatorMixin
from sqlalchemy.sql.expression import select
from strawberry.utils.str_converters import to_camel_case

T = TypeVar("T")


def camel_to_snake(name):
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


@strawberry.type
class HSKEntry:
    # levels: list[HSKLevel]
    levels: Optional[list[int]] = None

    @staticmethod
    def from_dict(entries):
        if not entries:
            return HSKEntry(levels=[])
        return HSKEntry(levels=[int(v["hsk"]) for v in entries])


@strawberry.type
class Etymology:
    type: str
    hint: Optional[str]
    phonetic: Optional[str]
    semantic: Optional[str]

    @staticmethod
    def from_dict(obj):
        if not obj:
            return None
        return Etymology(
            type=obj["type"], hint=obj.get("hint"), phonetic=obj.get("phonetic"), semantic=obj.get("semantic")
        )


@strawberry.type
class FrequencyEntry:
    wcpm: str  # word count per million
    wcdp: str  # word count ??? percent -> basically the percentage of all subtitles that contain the word
    pos: str  # dot-separated list of parts of speech
    pos_freq: str  # dot-separated list of the frequencies of the above parts of speech

    @staticmethod
    def from_dict(entries):
        # there is a weird thing where there are values with no pinyin, but always just one
        # and there is always another entry that has a pinyin. No idea what this is...
        # Just get the first one with a pinyin
        if not entries:
            # return None
            return FrequencyEntry(wcpm="", wcdp="", pos="", pos_freq="")
        for v in entries:
            if v.get("pinyin") or v.get("zipf"):  # FIXME: this is brittle to making generic!
                return FrequencyEntry(wcpm=v["wcpm"], wcdp=v["wcdp"], pos=v["pos"], pos_freq=v["pos_freq"])
        return FrequencyEntry(
            wcpm=entries[0]["wcpm"],
            wcdp=entries[0]["wcdp"],
            pos=entries[0]["pos"],
            pos_freq=entries[0]["pos_freq"],
        )


@strawberry.type
class POSValuesSet:
    pos_tag: str  # this is the standardised tag
    values: list[str] = field(default_factory=list)  # is this a string or strings?


@strawberry.type
class ProviderTranslations:
    provider: str
    pos_translations: list[POSValuesSet] = field(default_factory=list)


@strawberry.type
class CharacterStrokes:
    medians: list[list[list[float]]]
    strokes: list[str]
    rad_strokes: Optional[list[int]]

    @staticmethod
    def from_dict(obj):
        if not obj:
            return None
        return CharacterStrokes(medians=obj["medians"], strokes=obj["strokes"], rad_strokes=obj.get("radStrokes"))


@strawberry.type
class Characters:
    id: str
    pinyin: list[str]
    decomposition: str
    radical: str
    etymology: Optional[Etymology] = None
    structure: Optional[CharacterStrokes] = None
    deleted: Optional[bool] = False  # for the moment, let's just assume it's not deleted :-)
    updated_at: Optional[float] = 0

    @staticmethod
    def from_dict(objects, updated_at) -> list[Characters]:
        chars = []
        for obj in objects:
            char = Characters(
                id=obj["id"],
                pinyin=obj["pinyin"],
                decomposition=obj["decomposition"],
                radical=obj["radical"],
                updated_at=updated_at,
            )
            if obj.get("structure"):
                char.structure = CharacterStrokes.from_dict(obj["structure"])
            if obj.get("etymology"):
                char.etymology = Etymology.from_dict(obj["etymology"])

            chars.append(char)
        return chars

    @staticmethod
    def from_import_strings(hanzi_writer, make_me_a_hanzi, updated_at) -> list[Characters]:
        characters = []
        strokes = json.loads(hanzi_writer)
        for line in make_me_a_hanzi:
            mmah = json.loads(line)
            character = Characters(
                id=mmah["character"],
                structure=strokes.get(mmah["character"]),
                decomposition=mmah["decomposition"],
                radical=mmah["radical"],
                updated_at=updated_at,
            )
            if mmah.get("etymology"):
                character.etymology = mmah.get("etymology")
            characters.append(character)
        return characters


def asdict_inner(obj, dict_factory=dict):
    # copied from python 3.9.2 with addition of to_camel_case, and made to pass pylint!
    if hasattr(type(obj), "__dataclass_fields__"):
        result = []
        for f in dataclasses.fields(obj):
            value = asdict_inner(getattr(obj, f.name), dict_factory)
            result.append((to_camel_case(f.name), value))
        return dict_factory(result)
    if isinstance(obj, tuple) and hasattr(obj, "_fields"):
        return type(obj)(*[asdict_inner(v, dict_factory) for v in obj])
    if isinstance(obj, (list, tuple)):
        return type(obj)(asdict_inner(v, dict_factory) for v in obj)
    if isinstance(obj, dict):
        return type(obj)((asdict_inner(k, dict_factory), asdict_inner(v, dict_factory)) for k, v in obj.items())
    return copy.deepcopy(obj)


@strawberry.type
class Definitions:
    id: str
    graph: str
    sound: list[str]
    hsk: Optional[HSKEntry] = None  # TODO: make this generic???
    frequency: Optional[FrequencyEntry] = None  # TODO: make this generic???
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False  # for the moment, let's just assume it's not deleted :-)
    synonyms: list[POSValuesSet] = field(default_factory=list)
    provider_translations: list[ProviderTranslations] = field(default_factory=list)

    @staticmethod
    def from_model_asdict(definition: models.CachedDefinition, providers: list[str]):
        obj = Definitions.from_model(definition, providers)
        dict_obj = asdict_inner(obj)  # this doesn't work dict_obj = asdict(obj)
        del dict_obj["deleted"]
        return dict_obj

    @staticmethod
    def from_model(definition: models.CachedDefinition, providers: list[str]) -> Definitions:
        stored = json.loads(definition.response_json)

        out_definition = Definitions(
            id=str(definition.word_id),  # RxDB requires a str for the primary key of a collection
            graph=definition.source_text,
            updated_at=definition.cached_date.timestamp(),
            sound=stored["p"].split(),
            frequency=FrequencyEntry.from_dict(stored["metadata"]["frq"]),
        )
        if stored["metadata"].get("hsk"):
            out_definition.hsk = HSKEntry.from_dict(stored["metadata"]["hsk"])

        for pos, syns in stored["syns"].items():
            out_definition.synonyms.append(POSValuesSet(pos_tag=pos, values=syns))

        for provider in providers:
            if provider not in stored["defs"]:
                continue
            sd = ProviderTranslations(provider=provider)
            for k2, v2 in stored["defs"][provider].items():
                sd.pos_translations.append(POSValuesSet(pos_tag=k2, values=[entry["nt"] for entry in v2]))
            out_definition.provider_translations.append(sd)
        return out_definition


@strawberry.type
class DayModelStats:
    id: str
    nb_seen: Optional[int] = 0
    nb_checked: Optional[int] = 0
    nb_success: Optional[int] = 0
    nb_failures: Optional[int] = 0
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(dj_model):
        return DayModelStats(
            id=dj_model.day,
            nb_seen=dj_model.nb_seen,
            nb_checked=dj_model.nb_checked,
            nb_success=dj_model.nb_success,
            nb_failures=dj_model.nb_failures,
            updated_at=dj_model.updated_at,
        )


@strawberry.type
class StudentDayModelStats(DayModelStats):
    student_id: Optional[int] = None
    pk_id: str

    @staticmethod
    def from_model(dj_model):
        return StudentDayModelStats(
            id=dj_model.day,
            nb_seen=dj_model.nb_seen,
            nb_checked=dj_model.nb_checked,
            nb_success=dj_model.nb_success,
            nb_failures=dj_model.nb_failures,
            updated_at=dj_model.updated_at,
            student_id=dj_model.user_id,
            pk_id=f"{dj_model.day}|{dj_model.user_id}",
        )


@strawberry.type
class WordModelStats:
    id: str
    nb_seen: Optional[int] = 0
    nb_seen_since_last_check: Optional[int] = 0
    last_seen: Optional[float] = 0
    nb_checked: Optional[int] = 0
    last_checked: Optional[float] = 0
    nb_translated: Optional[int] = 0  # unused but required by the API
    last_translated: Optional[float] = 0  # unused but required by the API
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_list(wmlist: list):
        ws = WordModelStats(
            id=wmlist[8],
            nb_seen=wmlist[1],
            last_seen=wmlist[2],
            nb_checked=wmlist[3],
            last_checked=wmlist[4],
            nb_seen_since_last_check=wmlist[5],
            # nb_translated=wmlist[?],  # unused
            # is_known=wmlist[6]
            updated_at=wmlist[7],
        )
        return ws


@strawberry.type
class StudentWordModelStats(WordModelStats):
    student_id: Optional[int] = None
    pk_id: str

    @staticmethod
    def from_list(wmlist: list):
        ws = StudentWordModelStats(
            id=wmlist[8],
            nb_seen=wmlist[1],
            last_seen=wmlist[2],
            nb_checked=wmlist[3],
            last_checked=wmlist[4],
            nb_seen_since_last_check=wmlist[5],
            # nb_translated=wmlist[?],  # unused
            # is_known=wmlist[6]
            updated_at=wmlist[7],
            student_id=wmlist[9],
            pk_id=f"{wmlist[8]}|{wmlist[9]}",
        )
        return ws


@strawberry.type
class Wordlists:
    id: str
    name: str
    word_ids: list[str]
    default: Optional[bool] = False
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    async def from_model(dj_model):
        async with async_session() as db:
            stmt = select(models.UserListWord.word_id).where(models.UserListWord.user_list_id == dj_model.id)
            result = await db.execute(stmt.order_by("default_order"))
            ulws = result.scalars().all()
            return Wordlists(
                id=dj_model.id,
                name=dj_model.title,
                default=dj_model.is_default,
                updated_at=dj_model.updated_at.timestamp(),
                # FIXME: do I need this?
                deleted=dj_model.deleted,
                word_ids=[str(w) for w in ulws],
            )


@strawberry.type
class Recentsentences:
    id: str  # wordId
    lz_content: Optional[str] = ""
    updated_at: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(dj_recentsentenceset):
        out = Recentsentences(
            id=str(dj_recentsentenceset.word_id),
            lz_content=dj_recentsentenceset.lz_content,
            updated_at=dj_recentsentenceset.updated_at.timestamp(),
            deleted=dj_recentsentenceset.deleted,
        )
        return out


@strawberry.type
class Persons:
    id: str
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    updated_at: Optional[float] = 0
    config: Optional[str] = ""
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.AuthUser):
        out = Persons(
            id=str(obj.id),
            full_name=obj.full_name,
            email=obj.email,
            updated_at=obj.updated_at.timestamp(),
            config=obj.config,
            # FIXME: probably bad
            deleted=not obj.is_active,
        )
        return out


@strawberry.type
class Cards:
    id: str
    interval: Optional[int] = 0
    due_date: Optional[float] = 0  # should this have a default value???
    repetition: Optional[int] = 0
    efactor: Optional[float] = 2.5
    front: Optional[str] = ""
    back: Optional[str] = ""
    updated_at: Optional[float] = 0
    first_revision_date: Optional[float] = 0
    last_revision_date: Optional[float] = 0
    first_success_date: Optional[float] = 0
    known: Optional[bool] = False
    suspended: Optional[bool] = False
    deleted: Optional[bool] = False

    @staticmethod
    def from_model(dj_card):
        out_card = Cards(
            id=f"{dj_card.word_id}-{dj_card.card_type}",
            interval=dj_card.interval,
            repetition=dj_card.repetition,
            efactor=dj_card.efactor,
            front=dj_card.front,
            back=dj_card.back,
            known=dj_card.known,
            suspended=dj_card.suspended,
            updated_at=dj_card.updated_at.timestamp(),
            deleted=dj_card.deleted,
        )
        if dj_card.first_revision_date:
            out_card.first_revision_date = dj_card.first_revision_date.timestamp()
        if dj_card.last_revision_date:
            out_card.last_revision_date = dj_card.last_revision_date.timestamp()
        if dj_card.first_success_date:
            out_card.first_success_date = dj_card.first_success_date.timestamp()
        if dj_card.due_date:
            out_card.due_date = dj_card.due_date.timestamp()

        return out_card


@strawberry.type
class CommonType:
    id: str
    created_by: Optional[str] = ""
    updated_by: Optional[str] = ""
    created_at: Optional[float] = 0
    updated_at: Optional[float] = 0
    title: Optional[str] = ""
    description: Optional[str] = ""
    status: Optional[int] = ActivatorMixin.ACTIVE_STATUS
    activate_date: Optional[float] = 0
    deactivate_date: Optional[float] = 0
    deleted: Optional[bool] = False

    @staticmethod
    def from_model_base(obj, Outtype: CommonType):
        out = Outtype(
            id=obj.id,
            created_by=obj.created_by_id,  # FIXME: change to username, but will need to joinload related!
            updated_by=obj.updated_by_id,  # FIXME: change to username, but will need to joinload related!
            status=obj.status,
            deleted=obj.deleted,
        )
        # FIXME: horrible hack for using this with ActivatorMixin as well as DefaultMixin
        if hasattr(obj, "title"):
            out.title = obj.title
        if hasattr(obj, "description"):
            out.description = obj.description

        # dates need to be converted to unix timestamps, but only if present
        if obj.created_at:
            out.created_at = obj.created_at.timestamp()
        if obj.updated_at:
            out.updated_at = obj.updated_at.timestamp()
        if obj.activate_date:
            out.activate_date = obj.activate_date.timestamp()
        if obj.deactivate_date:
            out.deactivate_date = obj.deactivate_date.timestamp()

        return out


@strawberry.type
class Languageclasses(CommonType):
    @staticmethod
    def from_model(obj):
        out = CommonType.from_model_base(obj, Languageclasses)
        return out


@strawberry.type
class RegistrationMixin(CommonType):
    class_id: Optional[str] = ""
    user_id: Optional[str] = ""

    @staticmethod
    def from_model(obj):
        out = CommonType.from_model_base(obj, RegistrationMixin)
        out.class_id = obj.class_id
        out.user_id = obj.user_id
        return out


@strawberry.type
class Teacherregistrations(RegistrationMixin):
    pass


@strawberry.type
class Studentregistrations(RegistrationMixin):
    pass


@strawberry.type
class Imports(CommonType):
    processing: Optional[int] = 0
    process_type: Optional[int] = 0
    import_file: Optional[str] = ""
    shared: Optional[bool] = False
    source_url: Optional[str] = ""
    extra_data: Optional[str] = ""

    @staticmethod
    def from_model(obj):
        out = CommonType.from_model_base(obj, Imports)
        out.processing = obj.processing
        out.process_type = obj.process_type
        out.import_file = obj.import_file
        out.shared = obj.shared
        out.source_url = obj.source_url
        out.extra_data = obj.extra_data
        return out


@strawberry.type
class Surveys(CommonType):
    survey_json: Optional[str] = ""
    is_obligatory: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.Survey):
        out = CommonType.from_model_base(obj, Surveys)
        out.survey_json = obj.survey_json
        out.is_obligatory = obj.is_obligatory
        return out


@strawberry.type
class Usersurveys(CommonType):  # FIXME: this isn't really a common_type, it doesn't have activator
    survey_id: Optional[str] = ""
    data: Optional[str] = ""

    @staticmethod
    def from_model(obj: models.UserSurvey):
        out = CommonType.from_model_base(obj, Usersurveys)
        out.data = obj.data
        out.survey_id = obj.survey_id
        return out


@strawberry.type
class Userdictionaries(CommonType):
    lz_content: Optional[str] = ""
    processing: Optional[int] = 0
    from_lang: Optional[str] = ""
    to_lang: Optional[str] = ""
    shared: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.UserDictionary):
        out = CommonType.from_model_base(obj, Userdictionaries)
        out.lz_content = obj.lz_content
        out.processing = obj.processing
        out.from_lang = obj.from_lang
        out.to_lang = obj.to_lang
        out.shared = obj.shared
        return out


@strawberry.type
class Goals(CommonType):
    parent: Optional[str] = ""
    priority: Optional[int] = 0
    user_list: Optional[str] = ""

    @staticmethod
    def from_model(obj: models.Goal):
        out = CommonType.from_model_base(obj, Goals)
        out.parent = obj.parent_id if obj.parent_id else None
        out.priority = obj.priority
        out.user_list = obj.user_list_id if obj.user_list_id else None
        return out


@strawberry.type
class Contents(CommonType):
    processing: Optional[int] = 0
    the_import: Optional[str] = ""
    content_type: Optional[int] = 1
    author: Optional[str] = ""
    cover: Optional[str] = ""
    lang: Optional[str] = ""
    shared: Optional[bool] = False
    source_url: Optional[str] = ""
    extra_data: Optional[str] = ""

    @staticmethod
    def from_model(obj: models.Content):
        out = CommonType.from_model_base(obj, Contents)
        out.processing = obj.processing
        out.the_import = obj.the_import_id
        out.content_type = obj.content_type
        out.author = obj.author
        out.cover = obj.cover
        out.lang = obj.language
        out.shared = obj.shared
        out.source_url = obj.source_url
        out.extra_data = obj.extra_data
        return out


@strawberry.type
class Userlists(CommonType):
    processing: Optional[int] = 0
    the_import: Optional[str] = ""
    minimum_doc_frequency: Optional[int] = 0
    minimum_abs_frequency: Optional[int] = 0
    order_by: Optional[int] = 0
    nb_to_take: Optional[int] = 0
    shared: Optional[bool] = False
    words_are_known: Optional[bool] = False
    word_knowledge: Optional[int] = KNOWLEDGE_UNSET
    only_dictionary_words: Optional[bool] = False

    @staticmethod
    def from_model(obj: models.UserList):
        out = CommonType.from_model_base(obj, Userlists)
        out.processing = obj.processing
        out.the_import = obj.the_import_id or ""
        out.minimum_abs_frequency = obj.minimum_abs_frequency
        out.minimum_doc_frequency = obj.minimum_doc_frequency
        out.order_by = obj.order_by
        out.nb_to_take = obj.nb_to_take
        out.shared = obj.shared
        out.words_are_known = obj.words_are_known
        out.word_knowledge = obj.word_knowledge
        out.only_dictionary_words = obj.only_dictionary_words
        return out


# FIXME: this is not used with strawberry, only the from_model method is used
@strawberry.type
class FreeQuestions:
    id: str | None = ""
    context: str | None = ""
    created_by: str | None = ""
    updated_by: str | None = ""
    created_at: float | None = 0
    updated_at: float | None = 0
    deleted: bool | None = False

    @staticmethod
    def from_model(obj: models.FreeQuestion):
        return FreeQuestions(
            id=obj.id,
            context=obj.context,
            created_by=obj.created_by,
            created_at=obj.created_at.timestamp(),
            updated_by=obj.updated_by,
            updated_at=obj.updated_at.timestamp(),
        )


# FIXME: this is not used with strawberry, only the from_model method is used
@strawberry.type
class ContentQuestions:
    id: str | None = ""
    question_id: str | None = ""
    model_ids: str | None = ""
    href: str | None = ""
    created_by: str | None = ""
    updated_by: str | None = ""
    created_at: float | None = 0
    updated_at: float | None = 0
    deleted: bool | None = False

    @staticmethod
    def from_model(obj: models.ContentQuestion):
        return ContentQuestions(
            id=obj.id,
            content_id=obj.content_id,
            model_ids=obj.model_ids,
            href=obj.href,
            created_by=obj.created_by,
            created_at=obj.created_at.timestamp(),
            updated_by=obj.updated_by,
            updated_at=obj.updated_at.timestamp(),
        )


@strawberry.type
class Questions(CommonType):
    question: str | None = ""
    question_type: str | None = ""
    extra_data: str | None = ""
    shared: str | None = ""

    @staticmethod
    def from_model(obj: models.Question):
        out = CommonType.from_model_base(obj, Questions)
        out.question = obj.question
        out.question_type = obj.question_type
        out.extra_data = obj.extra_data
        out.shared = obj.shared
        return out


@strawberry.type
class Questionanswers(CommonType):
    question_id: str | None = ""
    student_answer: str | None = ""
    feedback: str | None = ""
    is_correct: bool | None = False

    @staticmethod
    def from_model(obj: models.QuestionAnswer):
        out = CommonType.from_model_base(obj, Questionanswers)
        out.question_id = obj.question_id
        out.student_answer = obj.student_answer
        out.feedback = obj.feedback
        out.is_correct = obj.is_correct
        return out


@strawberry.input
class PushRow(Generic[T]):
    assumedMasterState: Optional[T] = None
    newDocumentState: T


@strawberry.input
class ImportsInput(Imports, CommonType):
    pass


@strawberry.input
class GoalsInput(Goals, CommonType):
    pass


@strawberry.input
class UserlistsInput(Userlists, CommonType):
    pass


@strawberry.input
class UserdictionariesInput(Userdictionaries, CommonType):
    pass


@strawberry.input
class ContentsInput(Contents, CommonType):
    pass


@strawberry.input
class QuestionanswersInput(Questionanswers):
    pass


@strawberry.input
class UsersurveysInput(Usersurveys, CommonType):
    pass


@strawberry.input
class RecentsentencesInput(Recentsentences):
    pass


@strawberry.input
class CardsInput(Cards):
    pass


@strawberry.input
class LanguageclassesInput(Languageclasses):
    pass


@strawberry.input
class TeacherregistrationsInput(Teacherregistrations):
    pass


@strawberry.input
class StudentregistrationsInput(Studentregistrations):
    pass


@strawberry.type
class CollectionChanged:
    name: str


@strawberry.type
class Checkpoint:
    id: Optional[str] = ""
    updated_at: Optional[float] = -1


@strawberry.type
class Return(Generic[T]):
    documents: list[T]
    checkpoint: Checkpoint


@strawberry.input
class InputCheckpoint(Generic[T]):
    id: Optional[str] = ""
    updated_at: Optional[float] = -1
