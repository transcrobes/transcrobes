import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslate } from "react-admin";
import ReactSentence from "../../components/content/td/ReactSentence";
import { KeyedModels, MCQA, ReaderState } from "../../lib/types";

type Props = {
  models: KeyedModels | null;
  mcqa: MCQA;
  readerConfig: ReaderState;
  submitAnswer: (studentAnswer, isCorrect) => void;
  autoSubmit: boolean;
};

export default function RichMCQuestion({
  mcqa: { text, question, answers },
  models,
  readerConfig,
  submitAnswer,
  autoSubmit = true,
}: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const translate = useTranslate();

  return (
    <Box>
      {text && (
        <Typography sx={{ whiteSpace: "pre-line" }} m="1em">
          {text}
        </Typography>
      )}
      {models ? (
        <Box>
          --&gt;
          {models[question.toString()].s.map((sentence, index) => (
            <ReactSentence key={index} sentence={sentence} readerConfig={readerConfig} />
          ))}
        </Box>
      ) : (
        <Typography>--&gt; {question}</Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {answers?.map(({ answer, correct }, index) => (
          <Typography component="span" key={index}>
            <input
              disabled={!!selectedAnswer}
              type="radio"
              id={answer.mid}
              name="answer"
              value={answer.mid}
              onChange={(e) => {
                if (models && autoSubmit) {
                  submitAnswer(e.target.value, correct);
                }
                setSelectedAnswer(e.target.value);
                setIsCorrect(correct);
              }}
            />
            {models ? (
              models[answer.mid.toString()].s.map((sentence) => (
                <ReactSentence key={index} sentence={sentence} readerConfig={readerConfig} />
              ))
            ) : (
              <label htmlFor={answer.mid}>{answer.mid}</label>
            )}{" "}
            {answer.mid === selectedAnswer || (selectedAnswer && correct) ? (correct ? "✓" : "✗") : ""}
          </Typography>
        ))}
      </Box>
      {models && selectedAnswer && !autoSubmit && (
        <div>
          <Button onClick={() => submitAnswer(selectedAnswer, isCorrect)}>
            {translate("widgets.rich_mc_question.submit")}
          </Button>
        </div>
      )}
      <hr />
    </Box>
  );
}
