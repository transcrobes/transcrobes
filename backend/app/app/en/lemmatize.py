import logging

from aiohttp_retry import ExponentialRetry, RetryClient
from app.enrich.lemmatize import WordLemmatizer

logger = logging.getLogger(__name__)


class HTTPCoreNLPLemmatizer(WordLemmatizer):
    # override Lemmatizer
    async def lemmatize(self, lword) -> set[str]:
        max_attempts: int = (5,)
        max_wait_between_attempts: int = (300,)

        retry_options = ExponentialRetry(attempts=max_attempts, max_timeout=max_wait_between_attempts)
        async with RetryClient(raise_for_status=False, retry_options=retry_options) as client:
            logger.debug("Starting HTTPCoreNLPProvider aparse of: %s", lword)
            params = {"properties": self._config["params"]}
            async with client.post(self._config["base_url"], data=lword, params=params) as response:
                response.raise_for_status()
                logger.debug("Finished getting model from CoreNLP via http for lemmatisation")
                sents = (await response.json()).get("sentences", [])
                if not sents:
                    raise Exception("No sentences in response")
                else:
                    return {sents[0]["tokens"][0]["lemma"]}


# import spacy
# class SpaCy_EN_WordLemmatizer(WordLemmatizer):
#     # unused now with spacy 3
#     _POS = ["NOUN", "VERB", "ADJ"]
#
#     nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
#
#     def __init__(self, config):
#         self._config = config
#
#     # override Lemmatizer
#     async def lemmatize(self, lword) -> set[str]:
#         lemmas = []
#         doc = self.nlp(lword)
#         for t in doc:
#             # print(t.text, t.lemma_, t.norm_, t.pos_)
#             lemmas.append({"word": t.text, "lemma": t.lemma_, "pos": t.pos_})
#         # for pos in self._POS:
#         #     lemmas.update(self._lemmatizer(lword, pos))
#         return lemmas
