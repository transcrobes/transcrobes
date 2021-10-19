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
  user: {
    signup: "Create an account",
    // reset_password: "Reset password",
    // reset_password_error: "Error resetting password, please try again later",
    email: "Email",
    invalid_email: "Invalid email address",
    reset_password: {
      label: "Reset password",
      error: "Error resetting password, please try again later",
      success: "Reset email set, please check your email",
      password: "Password",
      repeat_password: "Repeat password",
      passwords_different: "Passwords are not the same",
      token_missing: "Invalid reset URL",
      validate_email_error:
        "There was an error validating the email, please try again in a few minutes",
      validating_email: "Please wait while the system validates your email",
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
