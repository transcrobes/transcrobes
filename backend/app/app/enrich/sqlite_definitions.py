"""
All active tables:

- characters
- definitions
- user_definitions
- definitions_status
- cards
- word_model_stats
- day_model_stats
- imports
- import_words
- userlists
- wordlists
- list_words

Inactive tables (but created?):
- persons
- student_word_model_stats
- student_day_model_stats

"""

# shared pull-only
DEFINITIONS_CREATE = """
CREATE TABLE IF NOT EXISTS definitions
(
  id INTEGER PRIMARY KEY,
  graph TEXT,
  sound TEXT,
  synonyms TEXT,
  provider_translations TEXT,
  wcpm REAL,
  wcdp REAL,
  pos TEXT,
  pos_freq TEXT,
  hsk TEXT,
  fallback_only INTEGER,
  updated_at REAL
) STRICT;
"""
DEFINITIONS_INDEX_ID_GRAPH = """CREATE UNIQUE INDEX IF NOT EXISTS idx_definitions_id_graph ON definitions(id, graph);"""
DEFINITIONS_INDEX_ID_GRAPH_DROP = """DROP INDEX IF EXISTS idx_definitions_id_graph;"""
DEFINITIONS_INDEX_ID_UPDATED_AT = (
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_definitions_id_updated_at ON definitions(id, updated_at);"""
)
DEFINITIONS_INDEX_ID_UPDATED_AT_DROP = """DROP INDEX IF EXISTS idx_definitions_id_updated_at;"""

DEFINITIONS_INSERT = """
INSERT INTO definitions
    (id, graph, sound, synonyms, provider_translations, wcpm, wcdp, pos, pos_freq, hsk, fallback_only, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

CHARACTERS_CREATE = """
CREATE TABLE IF NOT EXISTS characters
(
  id TEXT PRIMARY KEY,
  pinyin TEXT,
  decomposition TEXT,
  radical TEXT,
  etymology TEXT,
  structure TEXT,
  updated_at REAL
) STRICT;
"""
CHARACTERS_INSERT = """
INSERT INTO characters
    (id, pinyin, decomposition, radical, etymology, structure, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?)
"""

# SURVEYS_CREATE = """
# CREATE TABLE IF NOT EXISTS surveys
# (
#   id TEXT PRIMARY KEY,
#   survey_json TEXT,
#   is_obligatory INTEGER,
#   updated_at REAL
# );
# """
# # SURVEYS_INDEX = """CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_id ON surveys(id);"""
# # SURVEYS_INDEX_DROP = """DROP INDEX IF EXISTS idx_surveys_id;"""
# SURVEYS_INSERT = """
# INSERT INTO surveys
#     (id, survey_json, is_obligatory, updated_at)
# VALUES
#     (?, ?, ?, ?);
# """

# Individual pull-only
WORD_MODEL_STATS_CREATE = """
CREATE TABLE IF NOT EXISTS word_model_stats
(
  id INTEGER PRIMARY KEY,
  nb_seen INTEGER,
  nb_seen_since_last_check INTEGER,
  last_seen REAL,
  nb_checked INTEGER,
  last_checked REAL,
  nb_translated INTEGER,
  last_translated REAL,
  updated_at REAL
) STRICT;
"""
WORD_MODEL_STATS_INSERT = """
INSERT INTO word_model_stats
    (id, nb_seen, nb_seen_since_last_check, last_seen, nb_checked, last_checked, nb_translated, last_translated, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

DAY_MODEL_STATS_CREATE = """
CREATE TABLE IF NOT EXISTS day_model_stats
(
  id TEXT PRIMARY KEY,
  nb_seen INTEGER,
  nb_checked INTEGER,
  nb_success INTEGER,
  nb_failures INTEGER,
  updated_at REAL
) STRICT;
"""
DAY_MODEL_STATS_INSERT = """
INSERT INTO day_model_stats
    (id, nb_seen, nb_checked, nb_success, nb_failures, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?);
"""

LIST_WORDS_CREATE = """
CREATE TABLE IF NOT EXISTS list_words
(
  list_id TEXT,
  word_id INTEGER,
  default_order INTEGER,
  PRIMARY KEY (list_id, word_id)
) STRICT;
"""
LIST_WORDS_INSERT = """INSERT INTO list_words (list_id, word_id, default_order) VALUES (?, ?, ?);"""

IMPORTS_CREATE = """
CREATE TABLE IF NOT EXISTS imports
(
  id TEXT PRIMARY KEY,
  sentence_lengths TEXT,
  updated_at REAL
) STRICT;
"""
IMPORTS_INSERT = """INSERT INTO imports (id, sentence_lengths, updated_at) VALUES (?, ?, ?);"""

IMPORT_WORDS_CREATE = """
CREATE TABLE IF NOT EXISTS import_words
(
  import_id TEXT,
  word_id INTEGER,
  graph TEXT,
  nb_occurrences INTEGER,
  PRIMARY KEY (import_id, word_id)
) STRICT;
"""
IMPORT_WORDS_INDEX_ID = (
    """CREATE UNIQUE INDEX IF NOT EXISTS idx_import_words_id ON import_words(import_id, word_id, graph);"""
)
IMPORT_WORDS_INDEX_ID_DROP = """DROP INDEX IF EXISTS idx_import_words_id;"""
IMPORT_WORDS_INSERT = """INSERT INTO import_words (graph, import_id, nb_occurrences, word_id) VALUES (?, ?, ?, ?);"""

PERSONS_CREATE = """
CREATE TABLE IF NOT EXISTS persons
(
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  config TEXT,
  updated_at REAL
) STRICT;
"""
PERSONS_INSERT = """
INSERT INTO persons
    (id, full_name, email, config, updated_at)
VALUES
    (?, ?, ?, ?, ?);
"""

STUDENT_WORD_MODEL_STATS_CREATE = """
CREATE TABLE IF NOT EXISTS student_word_model_stats
(
  id TEXT,
  student_id TEXT,
  nb_seen INTEGER,
  nb_seen_since_last_check INTEGER,
  last_seen REAL,
  nb_checked INTEGER,
  last_checked REAL,
  nb_translated INTEGER,
  last_translated REAL,
  updated_at REAL,
  PRIMARY KEY (id, student_id)
) STRICT;
"""
STUDENT_WORD_MODEL_STATS_INSERT = """
INSERT INTO student_word_model_stats
    (id, student_id, nb_seen, nb_seen_since_last_check, last_seen, nb_checked, last_checked, nb_translated, last_translated, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

STUDENT_DAY_MODEL_STATS_CREATE = """
CREATE TABLE IF NOT EXISTS student_day_model_stats
(
  id TEXT,
  student_id TEXT,
  nb_seen INTEGER,
  nb_checked INTEGER,
  nb_success INTEGER,
  nb_failures INTEGER,
  updated_at REAL,
  PRIMARY KEY (id, student_id)
) STRICT;
"""
STUDENT_DAY_MODEL_STATS_INSERT = """
INSERT INTO student_day_model_stats
    (id, student_id, nb_seen, nb_checked, nb_success, nb_failures, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?);
"""

CARDS_CREATE = """
CREATE TABLE IF NOT EXISTS cards
(
  word_id INTEGER,
  card_type INTEGER,
  due_date REAL,
  first_revision_date REAL,
  last_revision_date REAL,
  first_success_date REAL,
  suspended INTEGER,
  known INTEGER,
  updated_at REAL,
  PRIMARY KEY (word_id, card_type)
) STRICT;
"""

CARDS_INSERT = """
INSERT INTO cards
    (word_id, card_type, due_date, first_revision_date, last_revision_date, first_success_date, suspended, known, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?);
"""

CARDS_INDEX_WORD_ID_CARD_TYPE_UPDATED_AT = """CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_word_id_card_type_updated_at ON cards(word_id, card_type, updated_at);"""
CARDS_INDEX_WORD_ID_CARD_TYPE_UPDATED_AT_DROP = """DROP INDEX IF EXISTS idx_cards_word_id_card_type_updated_at;"""

# FIXME: nasty, hybrid type... and should have a foreign key to userlist
WORDLISTS_CREATE = """
CREATE TABLE IF NOT EXISTS wordlists
(
  id TEXT PRIMARY KEY,
  name TEXT,
  is_default INTEGER,
  updated_at REAL
) STRICT;
"""
WORDLISTS_INSERT = """
INSERT INTO wordlists
    (id, name, is_default, updated_at)
VALUES
    (?, ?, ?, ?);
"""

# FIXME: add as foreign key? should I have an updated_at?
DEFINITIONS_STATUS_CREATE = """
CREATE TABLE IF NOT EXISTS definitions_status
(
  id INTEGER PRIMARY KEY,
  first_success_date REAL,
  ignore INTEGER
) STRICT;
"""
DEFINITIONS_STATUS_INSERT = """
INSERT INTO definitions_status
    (id, first_success_date, ignore)
VALUES
    (?, ?, ?)
"""

USER_DEFINITIONS_CREATE = """
CREATE TABLE IF NOT EXISTS user_definitions
(
  id TEXT,
  dictionary_id TEXT,
  translations TEXT,
  sounds TEXT,
  PRIMARY KEY (id, dictionary_id)
) STRICT;
"""
USER_DEFINITIONS_INSERT = """
INSERT INTO user_definitions
    (id, dictionary_id, translations, sounds)
VALUES
    (?, ?, ?, ?)
"""

USERDICTIONARIES_CREATE = """
CREATE TABLE IF NOT EXISTS userdictionaries
(
  id TEXT PRIMARY KEY,
  updated_at REAL
) STRICT;
"""
USERDICTIONARIES_INSERT = """
INSERT INTO userdictionaries
    (id, updated_at)
VALUES
    (?, ?)
"""
