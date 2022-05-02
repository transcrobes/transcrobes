import dayjs from "dayjs";
import { EFACTOR_DEFAULT, GRADE } from "../database/Schema";
import { CardType } from "./types";

function shuffleArray(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/*
repetition: the number of continous correct responses. The initial repetition value should be 0.
interval: inter-repetition interval after the repetitions (in days). The initial interval value should be 0.
efactor: easiness factor reflecting the easiness of memorizing and retaining a given item in memory.
    The initial efactor value should be EFACTOR_DEFAULT.

type SuperMemoItem = {
  interval: number;
  repetition: number;
  efactor: number;
};

grade:
  5: perfect response.
  4: correct response after a hesitation.
  3: correct response recalled with serious difficulty.
  2: incorrect response; where the correct one seemed easy to recall.
  1: incorrect response; the correct one remembered.
  0: complete blackout.
type SuperMemoGrade = 0 | 1 | 2 | 3 | 4 | 5;
*/

// function supermemo( item: SuperMemoItem, grade: SuperMemoGrade): SuperMemoItem {
// from https://github.com/Maxvien/supermemo
function supermemo(item: CardType, grade: GRADE) {
  let nextInterval; // let nextInterval: number;
  let nextRepetition; // let nextRepetition: number;
  let nextEfactor; // let nextEfactor: number;

  if (grade >= 3) {
    if (!item.repetition) {
      nextInterval = 1;
      nextRepetition = 1;
    } else if (item.repetition === 1) {
      nextInterval = 6;
      nextRepetition = 2;
    } else {
      nextInterval = Math.round((item.interval || 0) * (item.efactor || 0));
      nextRepetition = (item.repetition || 0) + 1;
    }
  } else {
    nextInterval = 0; // was nextInterval = 1;, but doesn't Anki put it to 0, meaning it will be repeated until we get it right???
    nextRepetition = 0;
  }

  nextEfactor = (item.efactor || EFACTOR_DEFAULT) + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

  if (nextEfactor < 1.3) {
    nextEfactor = 1.3;
  }

  return {
    interval: nextInterval,
    repetition: nextRepetition,
    efactor: nextEfactor,
  };
}

function practice(flashcard: CardType, grade: GRADE, failureSeconds: number): CardType {
  const { interval, repetition, efactor } = supermemo(flashcard, grade);
  const known = grade === GRADE.KNOWN;
  const dueDate = interval > 0 ? dayjs().add(interval, "day").unix() : dayjs().add(failureSeconds, "seconds").unix();

  const firstSuccessDate = flashcard.firstSuccessDate || (grade >= GRADE.HARD ? dayjs().unix() : 0);
  return { ...flashcard, interval, repetition, efactor, dueDate, known, firstSuccessDate };
}

export { shuffleArray, practice };
