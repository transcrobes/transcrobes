from __future__ import annotations

import json
import logging
import typing

import openai
from app.core.config import settings
from app.generative.lib import validate_mcqa
from app.models.data import Question
from app.models.lookups import OpenAIApiLookup
from sqlalchemy import select
from sqlalchemy.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

openai.api_key = settings.OPENAI_API_KEY

if typing.TYPE_CHECKING:
    from app.models.user import AuthUser


QUESTION_LANGUAGES = {
    "zh-Hans": "The question and answers should be in Mandarin Chinese using simplified characters.",
    "en": "",
}

MCQ_PROMPTS = {
    1: {
        "system": """You are a multiple choice question and answer generator. Always output your answer only in JSON in the following format:
            ```
            {{
              "question": "What is the best answer?",
              "answers": [
                {{answer: "This is the first answer.", correct: false}},
                {{answer: "This is the second answer.", correct: false}},
                {{answer: "This is the third answer.", correct: false}},
                {{answer: "This is the fourth answer.", correct: true}}
              ]
            }}
            ```
            There should be a total of 4 answers, only one of which is correct.
            The correct answer should be marked with `correct: true`.
            The question should be a string, and the answers should be an array of objects with the structure `{{answer: "This is an answer.", correct: false}}`.
            The question and answers should be based only on the input text.
            {lang_command}
          """,
        "user": """
            Create a language comprehension question and four multiple choice answers for the input text contained between triple backticks.
            The question and answers should be appropriate for an advanced second language learner.

            Text: ```
            {paragraph}
            ```
            """,
    },
    2: {
        "system": """You are a multiple choice question and answer generator. Always output your answer only in JSON in the following format:
            ```
            {{
              "question": "What is the best answer?",
              "answers": [
                {{"answer": "This is the first answer.", "correct": false}},
                {{"answer": "This is the second answer.", "correct": false}},
                {{"answer": "This is the third answer.", "correct": false}},
                {{"answer": "This is the fourth answer.", "correct": true}}
              ]
            }}
            ```
            There should be a total of 4 answers, only one of which is correct.
            The correct answer should be marked with `"correct": true`.
            The question should be a string, and the answers should be an array of objects with the structure `{{"answer": "This is an answer.", "correct": false}}`.
            The question and answers should be based only on the input text.
            {lang_command}
          """,
        "user": """
            Create a language comprehension question and four multiple choice answers for the input text contained between triple backticks.
            The question and answers should be appropriate for an advanced second language learner.

            Text: ```
            {paragraph}
            ```
            """,
    },
    3: {
        "system": """You are a multiple choice question and answer generator. Always output your answer only in JSON in the following format:
            ```
            {{
              "question": "What is the best answer?",
              "answers": [
                {{"answer": "This is the first answer.", "correct": false}},
                {{"answer": "This is the second answer.", "correct": false}},
                {{"answer": "This is the third answer.", "correct": false}},
                {{"answer": "This is the fourth answer.", "correct": true}}
              ]
            }}
            ```
            There should be a total of 4 answers, only one of which is correct.
            The correct answer should be marked with `"correct": true`.
            The question should be a string, and the answers should be an array of objects with the structure `{{"answer": "This is an answer.", "correct": false}}`.
            The question and answers should be based only on the input text and should ask about something specific in the text.
            Do not ask general questions, such as "What is this text about?" or "What is the main idea of this text?".
            {lang_command}
          """,
        "user": """
            Create a language comprehension question and four multiple choice answers for the input text contained between triple backticks.
            The question and answers should be appropriate for an advanced second language learner.

            Text: ```
            {paragraph}
            ```
            """,
    },
}


async def get_multiple_choice_qa_chat(
    db: AsyncSession, paragraph: str, user: AuthUser, prompt_version: int, model_name: str
):
    cached_entries = (
        (await db.execute(select(OpenAIApiLookup).filter(OpenAIApiLookup.source_text == paragraph))).scalars().first()
    )
    if cached_entries:
        return json.loads(cached_entries.response_json)
    logger.debug("No cached entries found for %s", paragraph[:100])
    messages = [
        {
            "role": "system",
            "content": MCQ_PROMPTS[int(prompt_version)]["system"].format(
                lang_command=QUESTION_LANGUAGES[user.from_lang]
            ),
        },
        {"role": "user", "content": MCQ_PROMPTS[int(prompt_version)]["user"].format(paragraph=paragraph)},
    ]
    chat_completion = openai.ChatCompletion.create(
        model=model_name,
        messages=messages,
        temperature=0,
        max_tokens=512,
    )
    ret = chat_completion.choices[0].message.content
    json_ret = json.loads(ret)
    validate_mcqa(json_ret)
    db.add(
        OpenAIApiLookup(
            source_text=paragraph,
            from_lang=user.from_lang,
            to_lang=user.from_lang,
            created_by=user,
            updated_by=user,
            response_json=ret,
            model_name=model_name,
            prompt_version=prompt_version,
            prompt_type=Question.MCQ,
        )
    )
    await db.commit()
    return json_ret


def get_multiple_choice_qa_instruct(paragraph, lang, prompt_version, model):
    content = f"""
{MCQ_PROMPTS[int(prompt_version)]["system"].format(lang_command=QUESTION_LANGUAGES[lang])}
{MCQ_PROMPTS[int(prompt_version)]["user"].format(paragraph=paragraph)}
    """
    completion = openai.Completion.create(model=model, prompt=content, temperature=0, max_tokens=512)
    ret = completion.choices[0].text
    json_ret = json.loads(ret)
    validate_mcqa(json_ret)
    return json_ret
