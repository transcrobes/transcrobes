import { TranslationMessages } from "react-admin";
import englishMessages from "ra-language-english";

const customEnglishMessages: TranslationMessages = {
  ...englishMessages,
  pos: {
    search: "Search",
    configuration: "Configuration",
    system: "Global Settings",
    help: "Help!",
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
    help: {
      site: "Website information",
    },
    signup: {
      label: "Create an account",
      error: "Error creating account, please try again later",
      email_success: "Account creation email sent, please check your email",
    },
    email: "Email",
    invalid_email: "Invalid email address",
    email_validated: "Email successfully validated, please log in!",
    validate_email_error: "There was an error validating the email, please try again in a few minutes",
    validating_email: "Please wait while the system validates your email",
    reset_password: {
      label: "Reset password",
      recover: "Send reset email",
      error: "Error resetting password, please try again later",
      email_success: "Reset email sent, please check your email",
      success: "Password reset successfully, please log in with the new password",
      password: "Password",
      repeat_password: "Repeat password",
      passwords_different: "Passwords are not the same",
      token_missing: "Invalid reset URL",
    },
  },
  resources: {
    imports: {
      name: "Imports",
    },
    userlists: {
      name: "Lists",
    },
    dictionaries: {
      name: "Dictionaries",
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
    exports: {
      name: "Exports",
    },
    stats: {
      name: "My stats",
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
    textcrobes: {
      name: "Textcrobes",
    },
    brocrobes: {
      name: "Brocrobes",
    },
    system: {
      name: "Global Settings",
      initialise: "Initialise",
    },
    help: {
      name: "Help!",
    },
  },
};

export default customEnglishMessages;
