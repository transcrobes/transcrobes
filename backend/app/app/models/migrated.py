# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, List, TypedDict

from app.data.context import get_broadcast
from app.data.models import NONE, REQUESTED
from app.db.base_class import Base
from app.db.session import async_session
from app.models.mixins import CachedAPIJSONLookupMixin, DetailedMixin, JSONLookupMixin, RevisionableMixin, utcnow
from app.models.user import AuthUser, absolute_imports_path, absolute_resources_path
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text, update

logger = logging.getLogger(__name__)

KNOWLEDGE_UNSET = 0
WORD_UNKNOWN = 2
WORD_HARD = 3
WORD_KNOWN = 5

if TYPE_CHECKING:
    from app.enrich.data import EnrichmentManager


def user_resources_path(user: AuthUser, filename: str) -> str:
    return f"user_{user.id}/resources/{filename}"


class BingApiLookup(CachedAPIJSONLookupMixin, Base):
    pass


class BingApiTranslation(CachedAPIJSONLookupMixin, Base):
    pass


class BingApiTransliteration(CachedAPIJSONLookupMixin, Base):
    pass


class ZhHskLookup(JSONLookupMixin, Base):
    pass


class ZhSubtlexLookup(JSONLookupMixin, Base):
    pass


class ZhhansEnABCLookup(JSONLookupMixin, Base):
    pass


class ZhhansEnCCCLookup(JSONLookupMixin, Base):
    pass


class Card(RevisionableMixin, Base):
    __table_args__ = (UniqueConstraint("user_id", "word_id", "card_type", name="uniq_user_card"),)

    L2_GRAPH = 1
    L2_SOUND = 2
    L1_MEANING = 3
    L2_PHRASE = 4

    CARD_TYPE = [
        (L2_GRAPH, "L2 written form"),  # JS GRAPH
        (L2_SOUND, "L2 sound form"),  # JS SOUND
        (L1_MEANING, "L1 meaning"),  # JS MEANING
        (L2_PHRASE, "L2 Phrase"),  # JS PHRASE
    ]

    id = Column(Integer, primary_key=True)
    card_type = Column(Integer, nullable=False, default=L2_GRAPH)
    interval = Column(Integer, nullable=False, default=0)
    repetition = Column(Integer, nullable=False, default=0)
    efactor = Column(Float(53), nullable=False, default=2.5)
    front = Column(Text)
    back = Column(Text)

    deleted = Column(Boolean, nullable=False, default=False)
    user_id = Column(
        ForeignKey("authuser.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    word_id = Column(
        ForeignKey("bingapilookup.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    due_date = Column(DateTime(True))
    known = Column(Boolean, nullable=False, default=False)
    suspended = Column(Boolean, nullable=False, default=False)
    first_revision_date = Column(DateTime(True))
    last_revision_date = Column(DateTime(True))
    first_success_date = Column(DateTime(True))

    # my changes
    user = relationship("AuthUser", back_populates="cards")


class Import(DetailedMixin, Base):
    __mapper_args__ = {"eager_defaults": True}  # required so that server_defaults get refreshed on create automatically

    VOCABULARY_ONLY = 1
    GRAMMAR_ONLY = 2
    VOCABULARY_GRAMMAR = 3
    PROCESS_TYPE = [
        (VOCABULARY_ONLY, "Vocabulary Only"),
        (GRAMMAR_ONLY, "Grammar Only"),
        (VOCABULARY_GRAMMAR, "Vocabulary and Grammar"),
    ]

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_file = Column(String(512), nullable=False)
    processing = Column(Integer, nullable=False, default=REQUESTED)
    process_type = Column(Integer, nullable=False, default=VOCABULARY_ONLY)
    analysis = Column(Text)
    shared = Column(Boolean, nullable=False, default=False)

    content = relationship("Content", back_populates="the_import", uselist=False)

    def imported_path(self):
        return absolute_imports_path(self.created_by.id, os.path.basename(self.import_file))

    def processed_path(self):
        return absolute_resources_path(self.created_by.id, os.path.basename(self.import_file))


class Survey(DetailedMixin, Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_json = Column(JSONB(astext_type=Text()), nullable=False)
    is_obligatory = Column(Boolean, nullable=False, default=False)


class GrammarRule(Base):
    __table_args__ = (UniqueConstraint("hsk_id", "hsk_sub_id"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(1000), nullable=False)
    rule = Column(String(1000), nullable=False)
    hsk_id = Column(String(1000))
    hsk_sub_id = Column(String(1000))
    topic_id = Column(Integer, nullable=False)
    help_url = Column(String(1000))


class UserGrammarRule(Base):
    __table_args__ = (UniqueConstraint("user_id", "grammar_rule_id"),)

    id = Column(Integer, primary_key=True)
    is_known = Column(Boolean)
    grammar_rule_id = Column(
        ForeignKey("grammarrule.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        ForeignKey("authuser.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    nb_checked = Column(Integer, nullable=False, default=0)
    nb_seen = Column(Integer, nullable=False, default=0)
    nb_studied = Column(Integer, nullable=False, default=0)
    last_checked = Column(DateTime(True))
    last_seen = Column(DateTime(True))
    last_studied = Column(DateTime(True))
    nb_seen_since_last_check = Column(Integer, nullable=False, default=0)
    nb_seen_since_last_study = Column(Integer, nullable=False, default=0)
    updated_at = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )

    grammar_rule = relationship("GrammarRule")
    user = relationship("AuthUser")


class UserRecentSentences(Base):
    __table_args__ = (UniqueConstraint("user_id", "word_id"),)

    id = Column(Integer, primary_key=True)
    lz_content = Column(String(25000), nullable=False)
    user_id = Column(
        ForeignKey("authuser.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    word_id = Column(
        ForeignKey("bingapilookup.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )

    deleted = Column(Boolean, nullable=False, default=False)
    user = relationship("AuthUser")
    word = relationship("BingApiLookup")


class UserWord(Base):
    __table_args__ = (UniqueConstraint("user_id", "word_id"),)

    id = Column(Integer, primary_key=True)
    nb_seen = Column(Integer, nullable=False, default=0)
    last_seen = Column(DateTime(True))
    nb_checked = Column(Integer, nullable=False, default=0)
    last_checked = Column(DateTime(True))
    user_id = Column(
        ForeignKey("authuser.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    word_id = Column(
        ForeignKey("bingapilookup.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    nb_seen_since_last_check = Column(Integer, nullable=False, default=0)
    is_known = Column(Boolean, nullable=False, default=False)
    last_translated = Column(DateTime(True))
    nb_translated = Column(Integer, default=0)
    updated_at = Column(
        DateTime(True),
        nullable=False,
        onupdate=utcnow(),
        server_default=utcnow(),
        index=True,
    )

    created_by = relationship("AuthUser")
    word = relationship("BingApiLookup")


class CachedDefinition(CachedAPIJSONLookupMixin, Base):
    __table_args__ = (
        CachedAPIJSONLookupMixin.unique,
        Index("cach_cached__6fe42c_idx", "cached_date", "from_lang", "to_lang"),
    )

    word_id = Column(
        ForeignKey("bingapilookup.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )

    word = relationship("BingApiLookup")


class Content(DetailedMixin, Base):
    BOOK = 1
    VIDEO = 2
    # AUDIOBOOK = 3
    # MUSIC = 4
    # MANGA = 5
    CONTENT_TYPE = [
        (BOOK, "Book"),
        (VIDEO, "Video"),
    ]
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_type = Column(Integer, nullable=False, default=BOOK)
    author = Column(String(150))
    cover = Column(String(250))
    language = Column(String(30))
    the_import_id = Column(
        ForeignKey("import.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        unique=True,
    )
    processing = Column(Integer, nullable=False, default=NONE)
    shared = Column(Boolean, nullable=False, default=False)

    the_import = relationship("Import", back_populates="content", uselist=False)

    def processed_path(self) -> str:
        return absolute_resources_path(self.created_by.id, self.id)


class UserListDict(TypedDict, total=False):
    word: str
    import_frequency: int
    word_id: int
    freq: float


class UserList(DetailedMixin, Base):
    ABSOLUTE_FREQUENCY = 0
    IMPORT_FREQUENCY = 1
    # A mix of the two? With a weight?
    ORDER_BY_CHOICES = [
        (ABSOLUTE_FREQUENCY, "Absolute Frequency"),
        (IMPORT_FREQUENCY, "Frequency in import"),
    ]

    only_simplifieds = True  # maybe should be optional

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nb_to_take = Column(Integer, nullable=False, default=-1)
    only_dictionary_words = Column(Boolean, nullable=False, default=True)
    minimum_abs_frequency = Column(Integer, nullable=False, default=-1)
    processing = Column(Integer, nullable=False, default=REQUESTED)
    the_import_id = Column(ForeignKey("import.id", deferrable=True, initially="DEFERRED"), index=True)
    shared = Column(Boolean, nullable=False, default=False)
    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    minimum_doc_frequency = Column(Integer, nullable=False, default=-1)
    order_by = Column(Integer, nullable=False, default=ABSOLUTE_FREQUENCY)
    words_are_known = Column(Boolean, nullable=False, default=False)
    word_knowledge = Column(Integer, nullable=True, default=KNOWLEDGE_UNSET)

    the_import = relationship("Import")

    def filter_words(self, import_frequencies):
        from app.ndutils import is_useful_character  # pylint:disable=C0415

        # FIXME: nasty hardcoding
        # abs_frequency_table = manager.metadata()[1]  # 0 = HSK, 1 = Subtlex
        word_list = []
        for freq, words in import_frequencies["vocabulary"]["buckets"].items():
            # if freq < self.minimum_doc_frequency:
            #     continue

            new_list = []
            for word in words:
                # if self.minimum_abs_frequency > 0:
                #     abs_frequency = self.minimum_abs_frequency < abs_frequency_table.get(word)
                #     # wcpm = word count per million
                #     if not abs_frequency or abs_frequency[0]['wcpm'] < self.minimum_abs_frequency:
                #         continue

                if self.only_simplifieds:
                    for character in word:
                        if is_useful_character(character):
                            new_list.append(word)
                            break
            word_list += [(freq, word) for word in new_list]

        return word_list

    async def update_list_words(
        self, db: AsyncSession, manager: EnrichmentManager
    ):  # noqa:C901 # pylint: disable=R0914,R0915
        import_frequencies = json.loads(self.the_import.analysis)
        word_list = self.filter_words(import_frequencies)

        logger.info(
            f"Processing {len(word_list)} words in update_list_words"
            f" for UserList {self.id} for user {self.created_by.username}"
        )

        data: List[UserListDict] = []
        for freq, word in word_list:
            data.append(UserListDict(word=word, import_frequency=int(freq)))

        temp_table = f"import_{self.id}".replace("-", "_")

        sql = f"""
            CREATE TEMP TABLE {temp_table} (word text,
                                            import_frequency int,
                                            word_id int null,
                                            freq float null
                                            )"""

        # FIXME: this algorithm needs some serious optimisation!!!
        await db.execute(text(sql))
        await db.execute(
            text(
                f"""
            INSERT INTO {temp_table} (word, import_frequency) values (:word, :import_frequency)
        """
            ),
            data,
        )
        # Get the ID for each word from the reference table (currently enrich_bingapilookup)
        await db.execute(
            text(
                f"""UPDATE {temp_table}
                SET word_id = bingapilookup.id
                FROM bingapilookup
                WHERE word = bingapilookup.source_text
                    and bingapilookup.from_lang = :from_lang
                    and bingapilookup.to_lang = :to_lang"""
            ),
            {"from_lang": manager.from_lang, "to_lang": manager.to_lang},
        )

        await db.execute(
            text(
                f"""UPDATE {temp_table}
                SET freq = ((zhsubtlexlookup.response_json::json->0)::jsonb->>'wcpm')::float
                FROM zhsubtlexlookup
                WHERE word = zhsubtlexlookup.source_text"""
            )
        )

        sql = f"SELECT word FROM {temp_table} WHERE word_id IS NULL"

        # filtering - this is slow and we have limits, so only get what we really need NOW (we
        # can always get others later)
        filters = []
        if self.minimum_abs_frequency > 0:
            filters += [f"{temp_table}.freq > {self.minimum_abs_frequency}"]
        if self.minimum_doc_frequency > 0:
            filters += [f"{temp_table}.import_frequency > {self.minimum_doc_frequency}"]

        sql += (" AND " + " AND ".join(filters)) if filters else ""
        result = await db.execute(text(sql))

        new_words = result.fetchall()

        logger.info(
            f"Creating ref entries for {len(new_words)} system-unknown words in update_list_words"
            f" for UserList {self.id} for user {self.created_by.email}"
        )

        if new_words and len(new_words) > 0:
            async with async_session() as lookups_db:  # must use a different db, as it can rollback
                # FIXME: make sure to want to do this!!! maybe better to have a filter on only dictionary words???
                for word in new_words:
                    # TODO: this is a nasty hack with a side effect of creating bing_lookups, which are
                    # our reference values, thus ensuring that all words in the import exist in the db
                    token = {"word": word[0], "pos": "NN", "lemma": word[0]}
                    await manager.default().get_standardised_defs(lookups_db, token)

        if new_words:
            sql = f"""UPDATE {temp_table}
                      SET word_id = bingapilookup.id
                      FROM bingapilookup
                      WHERE word = bingapilookup.source_text
                          AND from_lang = :from_lang AND to_lang = :to_lang"""
            await db.execute(text(sql), {"from_lang": manager.from_lang, "to_lang": manager.to_lang})

        sql = f"""
            SELECT word_id
            FROM {temp_table}
                INNER JOIN bingapilookup ON bingapilookup.id = word_id """

        if self.only_dictionary_words:  # FIXME: this should include the other dictionaries also!!!
            filters += ["json_array_length(bingapilookup.response_json::json->0->'translations') > 0"]

        sql += (" WHERE " + " AND ".join(filters)) if filters else ""

        # TODO: make more generic
        if self.order_by == self.ABSOLUTE_FREQUENCY:
            sql += f" ORDER BY {temp_table}.freq DESC "
        else:
            sql += f" ORDER BY {temp_table}.import_frequency DESC "
        sql += f" LIMIT {self.nb_to_take} " if self.nb_to_take > 0 else ""

        result = await db.execute(text(sql))

        new_userwords = []
        new_userlistwords = []
        newstuff = result.fetchall()
        for i, word_id in enumerate(newstuff):
            if i % 4000 == 0 and i > 0:  # 4000 == 28000 / 7, which keeps us under the params limit of 32k
                stmt = postgresql.insert(UserWord).values(new_userwords)
                stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "word_id"])
                await db.execute(stmt)
                stmt = postgresql.insert(UserListWord).values(new_userlistwords)
                stmt = stmt.on_conflict_do_nothing(index_elements=["user_list_id", "word_id"])
                await db.execute(stmt)
                new_userwords = []
                new_userlistwords = []

            new_userwords.append(
                {
                    "user_id": self.created_by.id,
                    "word_id": word_id[0],
                    "nb_seen": 0,
                    "nb_checked": 0,
                    "nb_seen_since_last_check": 0,
                    "is_known": self.word_knowledge == WORD_KNOWN,
                }
            )
            new_userlistwords.append({"user_list_id": self.id, "word_id": word_id[0], "default_order": i})

        if len(new_userwords) > 0:
            stmt = postgresql.insert(UserWord).values(new_userwords)
            stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "word_id"])
            await db.execute(stmt)
        if len(new_userlistwords) > 0:
            stmt = postgresql.insert(UserListWord).values(new_userlistwords)
            stmt = stmt.on_conflict_do_nothing(index_elements=["user_list_id", "word_id"])
            await db.execute(stmt)

        logger.info(f"Added {len(new_userlistwords)} list words for user_list_{self.id} for {self.created_by.email}")
        new_cards = []
        if self.word_knowledge:  # not null and greater than zero
            # FIXME: make this not so ugly
            # first we make sure that we have all of the items in the list as cards
            result = await db.execute(select(UserListWord.word_id).where(UserListWord.user_list_id == self.id))
            import_now = datetime.now() if self.word_knowledge > WORD_UNKNOWN else None
            interval = 0 if self.word_knowledge < WORD_HARD else 6 if self.word_knowledge > WORD_HARD else 1
            repetition = 0 if self.word_knowledge < WORD_HARD else 2 if self.word_knowledge > WORD_HARD else 1
            due_date = import_now if self.word_knowledge == WORD_UNKNOWN else import_now + timedelta(days=interval)

            for i, ul_word in enumerate(result.scalars().all()):
                for card_type in Card.CARD_TYPE:
                    new_cards.append(
                        {
                            "user_id": self.created_by.id,
                            "word_id": ul_word,
                            "card_type": card_type[0],
                            "known": self.word_knowledge == WORD_KNOWN,
                            "interval": interval,
                            "repetition": repetition,
                            "efactor": 2.5,
                            "deleted": False,
                            "suspended": False,
                        }
                    )
                # 900 == 32500 / (9 * 4) (nb args), which keeps us under the params limit of 32k
                if i % 900 == 0 and i > 0:
                    stmt = (
                        postgresql.insert(Card)
                        .values(new_cards)
                        .on_conflict_do_nothing(index_elements=["user_id", "word_id", "card_type"])
                    )
                    await db.execute(stmt)
                    new_cards = []

            if len(new_cards) > 0:
                stmt = (
                    postgresql.insert(Card)
                    .values(new_cards)
                    .on_conflict_do_nothing(index_elements=["user_id", "word_id", "card_type"])
                )
                await db.execute(stmt)

            # Now we have all the cards, we make sure all have been identified as "known" of some description
            stmt = (
                update(Card)
                .where(Card.user_id == self.created_by.id)
                .where(Card.word_id == UserListWord.word_id)
                .where(UserListWord.user_list_id == self.id)
                .values(first_success_date=import_now)
            )
            stmt = stmt.values(first_revision_date=import_now)
            stmt = stmt.values(last_revision_date=import_now)
            stmt = stmt.values(due_date=due_date)
            stmt = stmt.values(updated_at=datetime.now())
            stmt = stmt.execution_options(synchronize_session="fetch")
            await db.execute(stmt)

        await db.execute(text(f"DROP TABLE {temp_table}"))
        await db.commit()
        await self.publish_updates()

    async def publish_updates(self):
        broadcast = await get_broadcast()
        await broadcast.publish(channel="word_list", message=str(self.created_by.id))
        await broadcast.publish(channel="user_list", message=str(self.created_by.id))
        if self.word_knowledge:
            await broadcast.publish(channel="cards", message=str(self.created_by.id))


class UserSurvey(DetailedMixin, Base):
    __table_args__ = (UniqueConstraint("created_by_id", "survey_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data = Column(JSONB(astext_type=Text()))
    survey_id = Column(
        ForeignKey("survey.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    survey = relationship("Survey")


class Goal(DetailedMixin, Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(ForeignKey("goal.id", deferrable=True, initially="DEFERRED"), index=True)
    user_list_id = Column(ForeignKey("userlist.id", deferrable=True, initially="DEFERRED"), index=True)
    priority = Column(Integer, nullable=False, default=5)

    parent = relationship("Goal", remote_side=[id])
    user_list = relationship("UserList")


class UserlistGrammarRule(Base):
    __table_args__ = (UniqueConstraint("user_list_id", "grammar_rule_id"),)

    id = Column(Integer, primary_key=True)
    grammar_rule_id = Column(
        ForeignKey("grammarrule.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    user_list_id = Column(
        ForeignKey("userlist.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )

    grammar_rule = relationship("GrammarRule")
    user_list = relationship("UserList")


class UserListWord(Base):
    __table_args__ = (UniqueConstraint("user_list_id", "word_id"),)

    id = Column(Integer, primary_key=True)
    user_list_id = Column(
        ForeignKey("userlist.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    word_id = Column(
        ForeignKey("bingapilookup.id", deferrable=True, initially="DEFERRED"),
        nullable=False,
        index=True,
    )
    default_order = Column(Integer, nullable=False, default=0)

    user_list = relationship("UserList")
    word = relationship("BingApiLookup")
