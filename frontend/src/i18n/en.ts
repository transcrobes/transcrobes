import { TranslationMessages } from "react-admin";
import englishMessages from "ra-language-english";

const customEnglishMessages: TranslationMessages = {
  ...englishMessages,
  pos: {
    search: "Search",
    configuration: "Configuration",
    system: "System",
    language: "Language",
    theme: {
      name: "Theme",
      light: "Light",
      dark: "Dark",
    },
    dashboard: {
      welcome: {
        title: "Welcome to Transcrobes!",
        subtitle: "Learn a language doing stuff you love.",
      },
    },
    menu: {
      input: "Input",
      organisation: "Organisation",
      learning: "Learning",
      surveys: "Surveys",
    },
  },
  resources: {
    imports: {
      name: "Imports",
    },
    userlists: {
      name: "Lists",
    },
    goals: {
      name: "Goals",
    },
    contents: {
      name: "Content",
    },
    surveys: {
      name: "Surveys",
    },
    listrobes: {
      name: "Listrobes",
    },
    notrobes: {
      name: "Notrobes",
    },
    repetrobes: {
      name: "Repetrobes",
    },
    brocrobes: {
      name: "Brocrobes",
    },
    system: {
      name: "System",
      initialise: "Initialise",
    },
  },
};

export default customEnglishMessages;
