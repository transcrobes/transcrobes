import { TranslationMessages } from "react-admin";
import englishMessages from "ra-language-english";

const customEnglishMessages: TranslationMessages = {
  ...englishMessages,
  unsupported: {
    title: "Unsupported browser",
    chrome_version:
      "Chromium-compatible browsers are supported for version 111+. Please update to the latest version of your browser.",
    opera_version:
      "Opera Desktop is supported for version 98+ and Android for 74.3+ (and on iOS 16.4+). Please update Opera to the latest version.",
    firefox_version: "Firefox is supported on version 111+. Please update Firefox to the latest version.",
    safari_version: "Safari is supported on iOS 16.4+ and macOS 13.3+. Please update your OS or use another device.",
    webview_version: "Unsupported. Please open Transcrobes in a normal browser window, or use the Play Store version.",
    message:
      "Transcrobes works best on one of the fully supported apps from the Apple App Store or Android Play Store or on either Google Chrome, Microsoft Edge, Opera or other Chromium-based browsers on either the desktop (Windows, Linux and Mac) or on Android. Firefox should also work on the desktop and Android, though may be slower than Chromium-based browsers. On Mac you can also use Apple's Safari browser.",
    message_ios: "On iOS you can currently use Safari or Opera. We are working to support other browsers for iOS.",
    message_rest:
      "We are working hard on bringing compatibility to all platforms. In the meantime, please use one of the supported browsers. Thank you.",
    button: "Download Edge",
  },
  pos: {
    en_treebank: {
      PU: "Punctuation",
      ADD: "Other",
      AFX: "Affix",
      GW: "Goes with",
      XX: "Other",
      HYPH: "hyphen",
      NFP: "Other",
      CC: "Coordinating conjunction",
      CD: "Cardinal number",
      DT: "Determiner",
      EX: "Existential _there_",
      FW: "Foreign word",
      IN: "Preposition or subordinating conjunction",
      JJ: "Adjective",
      JJR: "Adjective, comparative",
      JJS: "Adjective, superlative",
      LS: "List item marker",
      MD: "Modal",
      NN: "Noun, singular or mass",
      NNS: "Noun, plural",
      NNP: "Proper noun, singular",
      NNPS: "Proper noun, plural",
      PDT: "Predeterminer",
      POS: "Possessive ending",
      PRP: "Personal pronoun",
      PRP$: "Possessive pronoun",
      RB: "Adverb",
      RBR: "Adverb, comparitive",
      RBS: "Adverb, superlative",
      RP: "Particle",
      SYM: "Symbol",
      TO: "_to_",
      UH: "Interjection",
      VB: "Verb, base form",
      VBD: "Verb, past tense",
      VBG: "Verb, gerund or present participle",
      VBN: "Verb, past participle",
      VBP: "Verb, non-3rd person singular present",
      VBZ: "Verb, 3rd person singular present",
      WDT: "Wh-determiner",
      WP: "Wh-pronoun",
      WP$: "Possessive wh-pronoun",
      WRB: "Wh-adverb",
    },
    simple: {
      NOUN: "Noun",
      VERB: "Verb",
      ADJ: "Adjective",
      ADV: "Adverb",
      PREP: "Preposition",
      PRON: "Pronoun",
      CONJ: "Conjunction",
      DET: "Determiner",
      MODAL: "Modal",
      OTHER: "Other",
    },
    zh_treebank: {
      AD: "Adverb", // adverb
      AS: "Aspect Marker", // aspect marker
      BA: "BA-construction", // in ba-construction ,
      CC: "Coordinating conjunction", // coordinating conjunction
      CD: "Cardinal number", // cardinal number
      CS: "Subordinating conjunction", // subordinating conjunction
      DEC: "DE-relative clause", // in a relative-clause
      DEG: "DE-associative", // associative
      DER: "DE-V-de-R", // in V-de const. and V-de-R
      DEV: "DE-before verb", // before VP
      DT: "Determiner", // determiner
      ETC: '"etc" marker', // for words , ,
      FW: "Foreign word", // foreign words
      IJ: "Interjection", // interjection
      JJ: "Adjective", // other noun-modifier ,
      LB: 'Long "BEI"', // in long bei-const ,
      LC: "Localizer", // localizer
      M: "Measure word", // measure word
      MSP: "Other particle", // other particle
      NN: "Common noun", // common noun
      NR: "Proper noun", // proper noun
      NT: "Temporal noun", // temporal noun
      OD: "Ordinal number", // ordinal number
      ON: "Onomatopoeia", // onomatopoeia ,
      P: 'Preposition (excl "and")', // preposition excl. and
      PN: "Pronoun", // pronoun
      PU: "Punctuation", // punctuation
      SB: 'Short "BEI"', // in short bei-const ,
      SP: "Phrase-final particle", // sentence-final particle
      VA: "Predicative adjective", // predicative adjective
      VC: "Copula verb",
      VE: "YOU as main verb", // as the main verb
      VV: "Other verb", // other verb
      // Others added since then
      URL: "URL",
    },
  },
  user: {
    help: {
      site: "Website information",
    },
    login: {
      messages: {
        "001": "Email validated successfully",
        "002": "Email validation error, please contact %{adminEmails}",
        "003": "Email validation expired, please contact %{adminEmails}",
      },
    },
    signup: {
      label: "Create an account",
      error: "Error creating account, please try again later",
      email_success: "Account creation email sent, please check your email",
      email_success_long:
        "A validation email has been sent to the email address provided. Please validate this email by clicking in the link in the email.",
      consent_a: "I agree with the",
      consent_b: "Research Consent Terms",
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
  buttons: {
    general: {
      online_help: "Online help",
      watch_demo: "Watch Demo",
      say_it: "Say it!",
      download: "Download",
      back_to_netflix: "Back to Netflix",
      back_to_youku: "Back to Youku",
    },
  },
  general: {
    coming_soon: "Coming soon",
    voice_available: "Click to say the word in %{language}",
    voice_not_available: "No %{language} speech support installed",
    pos_unknown: "POS unknown",
    default: "Default",
    upload: "Upload",
  },
  database: {
    retrieving_files: "Retrieving data files : 1% complete",
    files_downloaded: "The data files have been downloaded, loading to the database : 13% complete",
    files_loaded: "The data files have been loaded into the database : 93% complete",
    synchronised: "The collections have been synchronised : 98% complete",
    synchronising: "Synchronising %{filename} : %{percent}% complete",
    init_finished: "The indexes have now been generated. The initialisation has finished! : 100% complete",
    importing: "Importing file %{i} : initialisation %{percent}% complete",
    updating_indexes: "Updating indexes : initialisation 90% complete",
    cache_exports_error:
      "There was an error downloading the data files. Please completely close your browser and try again in a few minutes and if you get this message again, contact Transcrobes support: ERROR!",
    datafile: "Retrieved data file: %{datafile}",
    getting_cache_list: "Getting list of data files",
    init_temp_storage: "Initialising temporary storage",
    init_storage: "Initialising storage",
    reinstalling: "Reinstalling database",
    init_structure: "Initialising database structure",
  },
  widgets: {
    beginners: {
      title: "What words do you know already?",
      intro: "To be useful Transcrobes needs to know what words you know already.",
      button_interface: "Use the interface",
      button_import: "Import a file",
      button_later: "Later (not recommended)",
    },
    card_type: {
      graph: "Graph",
      sound: "Sound",
      meaning: "Meaning",
      phrase: "Phrase",
    },
    content_actions: {
      read: "Read",
      watch: "Watch",
      enrich: "Enrich",
      resubmit: "Resubmit",
    },
    content_analysis: {
      title: "Personalised analysis",
      help_title: "Show personalised analysis of known and unknown words in the content",
      header_items: "Items",
      header_known_total: "Known / Total",
      header_ratio: "Ratio",
      number_of_characters: "Number of characters",
      number_of_words: "Number of words",
      avg_sentence_length: "Average sentence length (words)",
      types: "Different items (types)",
      tokens: "Items (tokens)",
    },
    content_type: {
      book: "Book",
      video: "Video",
    },
    content_value_analysis: {
      title: "Personalised value analysis",
      help_title: "Show personalised analysis of the learning value of the content for the selected goal",
      header_items: "Items",
      header_unknown_total: "Unknown / Total",
      header_ratio: "Ratio",
      number_of_words: "Number of words",
      number_of_found: "Number of words found",
      number_of_not_found: "Number of words not found",
      percent_useful_words: "% of useful unknown words",
      types: "Different items (types)",
      tokens: "Items (tokens)",
    },
    dictionary_provider: {
      title: "Dictionary providers",
      selected: "Selected",
      unselected: "Unselected",
    },
    editable_definition_translations: {
      edit: "Edit",
      use_me: "Use me instead",
      current_value: "Current value",
    },
    fine_control: {
      raw: {
        more: "Increase by %{amount}",
        less: "Decrease by %{amount}",
      },
      percent: {
        more: "Increase %{amount}%",
        less: "Decrease %{amount}%",
      },
    },
    gloss_font_override: {
      font_family: "Font family",
      gloss_font_family: "Gloss Font family",
      manual_font_selection: "Manual Font Selection",
    },
    grades: {
      hard: "Add as known (poorly)",
      unknown: "Plan to learn",
      good: "Add as known",
      known: "Add as known (no revision)",
    },
    main_text_override: {
      font_family: "Font family",
      gloss_font_family: "Gloss Font family",
      main_font_family: "Main text Font family",
      manual_font_selection: "Manual Font Selection",
      font_size: "Font size",
      text_colour: "Text colour",
      override_text_colour: "Override text colour",
      override_type: {
        none: "None",
        coloured: "Colour",
        tones: "Tones",
      },
    },
    meaning_editor: {
      type_something_here: "Type something here",
    },
    order_by: {
      absolute_frequency: "Absolute Frequency",
      import_frequency: "Frequency in import",
    },
    popup: {
      recent_sentences: "Recent sentences",
      synchronising: "New word synchronising, please wait",
      gloss_now: "Gloss right now",
      dont_gloss_now: "Don't gloss right now",
      saving_cards: "Saving Cards...",
      translating: "Translating...",
      no_hsk: "No HSK found,",
      hsk_level: "HSK: %{hsk},",
    },
    pos_items: {
      no_value_found: "No %{value} found",
    },
    practicerInput: {
      unknown_desc: "I don't know this word yet",
      hard_desc: "I am not confident with this word",
      good_desc: "I am comfortable with this word",
      known_desc: "I know this word, I don't need to revise it again",
    },
    process_type: {
      vocabulary_only: "Vocabulary Only",
      grammar_only: "Grammar Only",
      vocabulary_and_grammar: "Vocabulary and Grammar",
    },
    processing: {
      none: "None",
      requested: "Requested",
      processing: "Processing",
      finished: "Finished",
      error: "Error",
    },
    reader_config: {
      gloss_colour_title: "Gloss Text Colour",
      gloss_colour_label: "Override gloss colour",
      gloss_unsure_colour: "Override Unsure Gloss Background Colour",
      gloss_font_size: "Gloss Font Size",
      glossing_type: {
        title: "Glossing type",
        none: "None",
        simpler: "Simpler",
        sounds: "Sounds",
        l1: "L1",
        sounds_l1: "Sounds + L1",
      },
      glossing_position: {
        title: "Gloss position",
        after: "After",
        above: "Above",
        below: "Below",
        before: "Before",
      },
      segmentation: {
        title: "Segmentation",
        none: "None",
        segmented: "Segmented",
      },
      mouseover: {
        title: "Mouseover",
        none: "None",
        display_mouseover: "Display mouseover",
      },
      say_on_mouseover: {
        title: "Say on mouseover",
        none: "None",
        say: "Say on mouseover",
      },
      recent_phrases: {
        title: "Collect recent phrases",
        on: "On",
        off: "Off",
      },
      strict_provider_ordering: {
        title: "Strict provider ordering",
        on: "On",
        off: "Off",
      },
    },
    class_registration: {
      helper: "Enter the %{tipe} email",
      button: "Send %{tipe} request",
      request_sent: "%{tipe} registration request sent",
    },
    set_knowledge: {
      dont_set: "Don't set",
      hard: "Hard",
      unknown: "Unknown",
      good: "Good",
      known: "Known",
    },
    subwords: {
      title: "Subwords",
    },
    word_order_selector: {
      ordering: "Ordering",
      personal: "Personalised",
      natural: "Import order/Freq",
      wcpm: "Word Count/million",
    },
  },
  stats: {
    nb_seen: "Nb Seen",
    nb_checked: "Nb Checked",
    nb_successes: "Nb Successes",
    nb_re_revisions: "Nb Re-revisions",
    list_progress: {
      words_types: "Unique words (types)",
      chars_types: "Unique chars (types)",
    },
    content_progress: {
      words_types: "Unique words (types)",
      chars_types: "Unique chars (types)",
      words_tokens: "Total words (tokens)",
      chars_tokens: "Total chars (tokens)",
      avg_sentence_length: "Avg. sentence length",
      missing_stats: "There are no import stats available for this content",
      generating_stats: "The stats are still being generated",
      grammar_patterns: "Nb grammar patterns",
    },
    frequency: {
      title: "Freq:",
      description: "Frequency in the Subtlex Open Subtitles database",
      wcpm_description: "Word Count Per Million",
      wcdp_description: "Percentage of all films where the word appears",
    },
  },
  resources: {
    contents: {
      name: "Content",
      fields: {
        title: "Title",
        description: "Description",
        processing: "Processing",
        createdAt: "Created At",
        updatedAt: "Updated At",
        theImport: "Source Import",
        contentType: "Content Type",
        shared: "Shared",
        lang: "Language",
        cover: "Cover",
        author: "Author",
      },
      progress: "Progress",
      processingStatus: "Processing Status",
      contentStats: "Content Stats",
      value: "Vocab Value",
      action: "Action",
      offline: "Offline?",
      empty_list: "Imported content will appear here.",
      goals: "Goals",
      no_goal: "None",
      goal_selector: "Show expected content utility for Goal",
      loading: "Loading...",
      import_create: "+ Import Content",
    },
    goals: {
      name: "Goals",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "Created At",
        updatedAt: "Updated At",
        active: "Active",
        priority: "Priority",
        parent: "Parent",
        userList: "User List",
      },
      progress: "Progress",
      no_goals_message_a: "Goals are created from ",
      no_goals_message_b: "lists",
      no_goals_message_c: "You first need to",
      no_goals_message_d: "create a list",
      no_goals_message_e: ", then return here.",
      create_goals_now: "Create Goals now",
    },
    imports: {
      name: "Imports",
      fields: {
        title: "Title",
        description: "Description",
        processType: "Process Type",
        processing: "Processing",
        shared: "Shared",
        createdAt: "Created At",
        importFile: "Import File",
      },
      create: {
        form_description_a: "You can import",
        form_description_b: "files. Please check the dedicated",
        form_description_c: "for more information about supported import formats!",
      },
      progress: "Progress",
      contentStats: "Content Stats",
      processingStatus: "Processing Status",
    },
    languageclasses: {
      name: "Classes",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "Created At",
        updatedAt: "Updated At",
        status: "Status",
      },
      classParticipants: "Class Participants",
      teachers: "Teachers",
      students: "Students",
    },
    studentregistrations: {
      name: "Classes",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "Created At",
        updatedAt: "Updated At",
        status: "Status",
      },
      empty_list: "Teachers will invite you to join their classes, and registrations will appear here. ",
    },
    surveys: {
      name: "Surveys",
      fields: {
        title: "Title",
      },
    },
    teacherregistrations: {
      name: "Teacher Regs",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "Created At",
        updatedAt: "Updated At",
        status: "Status",
      },
      empty_list: "Teachers will invite you to join their classes, and registrations will appear here. ",
    },
    userdictionaries: {
      name: "Dictionaries",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "Created At",
        updatedAt: "Updated At",
        translations: "Translations",
      },
      saving_dictionary: "Saving Dictionary",
      changes_saved: `Changes to dictionary "%{title}" saved`,
      loading_entries: "Loading existing entries",
      loading_existing: "Loading dictionary",
      column_separator: "Column separator",
      meaning_sound_separator: "Meaning/Sound separator",
      quote_character: "Quote character",
      escape_character: "Escape character",
      contains_header_row: "Contains header row",
      import_preview: "Import Preview",
      import_valid_entries: "Valid import entries",
      existing_entries: "Existing Entries",
      filter: "Filter",
      import: "Dictionary import",
      invalid_entries: "Invalid import entries (ignored)",
      sounds: "Sounds",
      graph: "Graph",
    },
    userlists: {
      name: "Lists",
      fields: {
        title: "Title",
        description: "Description",
        processType: "Process Type",
        processing: "Processing",
        shared: "Shared",
        theImport: "Source Import",
        createdAt: "Created At",
        nbToTake: "Nb to take",
        orderBy: "Order by",
        minimumAbsFrequency: "Minimum Abs. Frequency",
        minimumDocFrequency: "Minimum Doc. Frequency",
        wordKnowledge: "Word Knowledge",
      },
      processingStatus: "Processing Status",
      setWordKnowledge: "Set word knowledge",
      progress: "Progress",
      nb_unique_words_in_list: "Nb unique words in list",
    },
  },
  screens: {
    boocrobes: {
      name: "Boocrobes",
      config: {
        title: "Settings",
        fullscreen: "Fullscreen",
        table_of_contents: "Table of Contents",
        back_to_contents: "Back to Contents",
        paging: {
          title: "Paging",
          paginated: "Paginated",
          scrolling: "Scrolling",
        },
        page_margins: "Page margins",
      },
      previous: "Previous",
      next: "Next",
      finding_previous_position: "Finding previous position",
    },
    brocrobes: {
      name: "Brocrobes",
      text_a: `Brocrobes is a browser extension, compatible with Google Chrome, Microsoft Edge, and other Chromium-derived
        browsers for personalised help reading webpages and watching videos on Netflix and Youku!`,
      text_b: "Download Brocrobes from:",
      text_b_chrome: "Chrome Web Store (currently NOT available in Mainland China)",
      text_b_edge: "Microsoft Edge Store (currently available in Mainland China)",
      text_b_direct: "Download the extension directly (use with Kiwi Browser on Android in Mainland China)",
      text_c: `Brocrobes brings the power of Transcrobes to every page on the web,
        giving you the same comfort you get inside this application everywhere.`,
      text_d: `The main Android browser vendors don't support extensions on mobile but you *can* use the Kiwi Browser.`,
      text_e: "Download the Kiwi Browser:",
      text_e_play: "Kiwi Browser on Google Play",
      text_e_direct: "Direct download (APK file)",
    },
    exports: {
      name: "Exports",
      title: "Data exports",
      per_word_activity: "Export per word activity data",
      per_day_activity: "Export per day activity data",
      all_card_data: "Export all Repetrobes card data",
    },
    extension: {
      title: "Transcrobes Server Connection Settings",
      save_warning: "Don't forget to hit save (at the bottom) after making a change!",
      loading_message: "Loading configuration from the local database...",
      login_error: `There was an error logging in to %{baseUrl}. \n\n
          Please check the login details, or try again in a short while.`,
      sync_error: "There was an error starting the initial synchronisation. Please try again in a short while.",
      error: `There was an error setting up Transcrobes.
        Please try again in a little while, or contact Transcrobes support (<a href="http://%{docsDomain}/page/contact/">here</a>)`,
      init_complete: "Initialisation complete!",
      update_complete: "Update complete!",
      saving_now: "Saving the options, please wait and keep this window open...",
      form_email: "Email",
      form_password: "Password",
      form_server: "Server URL",
      show_suggestions: "Show Suggestions?",
      show_research_details: "Show Research Details?",
      import: {
        title: "Import EPUB to Transcrobes",
        checking: "Checking %{linkUrl} for valid EPUB files...",
        sending: "Sending %{linkUrl} to Transcrobes server...",
        link_error: "Error: %{linkUrl} does not point to an EPUB file (%{destUrl})",
        started: "EPUB import has been successfully sent to the server, please check your imports page for progress.",
      },
      initialisation: {
        title: "Welcome! It's Transcrobes initialisation time!",
        intro_a: `Transcrobes is entirely browser-based but needs to download a some (25-50MB) reference data in order to save on
        bandwidth and dramatically improve performance, and that is going to take a while (3-10 minutes, depending on how fast your
          phone/tablet/computer is).`,
        intro_b: `It's better to not interrupt the initialisation while it's happening, so make sure your device has plenty
        of battery, or is plugged in.`,
        update: "Update settings",
        update_message: `Saving updated settings should only take a few seconds, unless you are changing your username. You may need
        to reinstall the extension (delete and add again) if you change your username and encounter issues.`,
        started: "Initialisation started",
        started_message: `Please be patient while the initialisation finishes. The initialisation will give some
          updates but you should not be worried unless you see no update for over 5 minutes.`,
      },
      missing_account: `You need an account on a Transcrobes server to Transcrobe a page. \n\n
        If you have an account please fill in the options page (right-click on the Transcrobe Me! icon -> Extension Options)
        with your login information (username, password, server URL).\n\n
        See the Transcrobes site http://%{docsDomain} for more information`,
      waiting_for_load: "Waiting for page to load...",
      popup_theme_mode: {
        title: "Popup Theme Mode",
        light_mode: "Light Mode",
        dark_mode: "Dark Mode",
      },
      page: {
        title: "Transcrobe page",
      },
      page_analysis: {
        title: "Page Analysis",
        off: "Off",
        top_right: "Top Right",
        bottom_right: "Bottom Right",
      },
      selection: {
        title: "Transcrobe selection",
      },
      streamer: {
        looking_for_subs: "Looking for subs...",
        processing_subs: "Processing subs...",
        sub_content_error: "Error processing subs",
        no_available_subs: "No available subs",
        bad_subs_lang: "Subs not in the correct language",
        no_id: "Unable to find video ID",
        no_data: "Unable to find video data",
        buffering: "Buffering...",
      },
    },
    help: {
      name: "Help!",
      title: "Transcrobes help centre",
      text_a: "The Transcrobes information site has user documentation for the Transcrobes platform.",
      text_b: "Find it here.",
      text_c: `There is a YouTube Channel a and playlist of walkthrough videos for all the major features of the software.`,
      text_d: `Connect with the Transcrobes community on Twitter or on Discord.`,
      text_e: `For anything not covered in the online documentation or for any comments, questions or suggestions about the
          software, theories or the research, please contact the Lead Researcher and developer, Anton Melser `,
      text_f: `Transcrobes is also an active academic research project. The key aspects of the theory behind the software are
          outlined here.`,
      text_g: `Find out more.`,
      youtube_channel: "YouTube Channel",
      playlist: "playlist of walkthrough videos",
    },
    initialisation: {
      title: "Welcome! It's Transcrobes initialisation time!",
      intro: `A lot of Transcrobes' functionality is available offline, which means you can keep reading your favourite books,
      watching your favourite movies or doing active learning exercises wherever you are, whenever you want. This does mean that
      the system needs to download and prepare some things, and that is going to take a while (3-10 minutes depending on how fast
       your phone/tablet/computer is).`,
      started: "Initialisation started",
      started_message: `Please be patient while the initialisation finishes. The initialisation will give some
          updates but you should not be worried unless you see no update for over 5 minutes.`,
    },
    listrobes: {
      name: "Listrobes",
      minimum_training_complete: "Minimum training completed. Continue training or start using the platform!",
      percent_training_complete: "Tell the system about the words you know (%{percentComplete} complete)",
      minimum_entry_complete: {
        title: "Minimum recommended training complete",
        message: `Now you've told the system a little about yourself, you can start using the platform.
          If you still know lots of words, you can continue training now, or come back and finish later.
          To start reading we recommend you try out the Chrome/Edge browser extension Brocrobes,
          or if you want to type or paste text, you can try out Textcrobes.`,
        continue_training: "Continue training?",
        try_brocrobes: "Try Brocrobes?",
        try_textcrobes: "Try Textcrobes?",
      },
      config: {
        title: "Listrobes Settings",
        advanced: "Advanced mode",
        source_word_lists: "Source word lists",
        items_per_page: "Items per page (1 to 250)",
        invalid_number: "Invalid number",
        default_click_order: "Default click order",
        no_options: "No options available",
        loading: "Loading...",
        placeholder: "Select...",
      },
      vocab_item_sound: "Sound:",
      vocab_item_meaning: "Meaning:",
      finished: "No remaining vocabulary items",
    },
    moocrobes: {
      name: "Moocrobes",
      load_video_file: "Load video file",
      fullscreen: "Fullscreen",
      config: {
        title: "Settings",
        text_shadow: {
          none: "None",
          title: "Text Outline",
          black: "Black",
          white: "White",
        },
        central_controls: {
          previous_sub: "Previous Sub",
          next_sub: "Next Sub",
          play: "Play",
          pause: "Pause",
          skip_back: "Skip Back",
          skip_forward: "Skip Forward",
        },
        subs_position: {
          title: "Subs position",
          top: "Top",
          bottom: "Bottom",
          under: "Under",
        },
        subs_box_width: {
          title: "Subs Box Width",
          minus: "Decrease 5%",
          plus: "Increase 5%",
        },
        subs_synchronisation: {
          title: "Subs Synchronisation",
          minus: "Behind 0.5s",
          plus: "Ahead 0.5s",
        },
        subs_background_blur: {
          title: "Blur behind subs",
          none: "None",
          blur: "Blur",
        },
        playback_rate: {
          title: "Playback Rate",
          minus: "Slow down by 5%",
          plus: "Speed up by 5%",
        },
        subtitle_playback_rate: {
          title: "Subtitle Playback Rate",
          minus: "Slow down by 5%",
          plus: "Speed up by 5%",
        },
        subs_raise: {
          title: "Raise subs",
        },
        volume_boost: {
          title: "Boost volume",
        },
      },
    },
    main: {
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
          message_a: "Explore the app and get help for each page using the dedicated",
          message_b: "button available on every screen.",
        },
        goals: {
          title: "Goals Progress",
        },
        word_chars_progress: {
          title: "Known words and characters (totals)",
        },
      },
      menu: {
        input: "Input",
        organisation: "Organisation",
        learning: "Learning",
        surveys: "Surveys",
        teaching: "Teaching",
      },
      finishing: "Finishing initial index loading...",
    },
    notrobes: {
      name: "Notrobes",
      title: "Notrobes: Vocabulary search, discover words",
      show_related: "Show related words",
      card_revision_details: "Card Revision Details",
      card_actions: "Card Actions",
      existing_cards: "Existing Cards",
      type: "Type",
      due_date: "Due Date",
      known: "Known?",
      no_cards: "No cards for this item",
      lists: "Lists (name: freq. position in list)",
      no_lists: "No lists for this item",
      radicals: "Radicals and composition",
      no_radicals: "No character details found",
      related_words: "Related Words",
      only_simplified_chars: "Only Simplified Characters",
      no_related_words: "No related words found",
      short_word_list: {
        id: "ID",
        sounds: "Sounds",
      },
      personal_word_stats: {
        title: "Personal Word Stats",
        nb_seen: "Nb. seen:",
        last_seen: "Last seen:",
        nb_seen_since_last_check: "Nb. seen since last check:",
        nb_checked: "Nb. Checked:",
        last_checked: "Last Checked:",
        no_word_stats: "No word stats found",
      },
      entry_definitions: "Entry Definitions",
      metadata: "Metadata",
      recently_seen_phrases: "Recently Seen Phrases",
      no_recently_seen_phrases: "No recent phrases found",
      no_results: "There are no search results. Please try a new search",
      no_network: "Failed to fetch the data. Please check network",
      cards_recorded: "Cards recorded",
      only_simplified: "Only simplified characters can be searched for",
      no_traditional: "The system does not currently support traditional characters",
      query_max_length: "The system only handles words of up to %{maxChars} characters",
      common_only: "Only commonly recognised words",
      by_chars: "By Character",
      by_sound: "By Sound",
      by_radical: "By Radical",
      loading_related: "Initialising related data indexes (15-60 secs)",
    },
    repetrobes: {
      name: "Repetrobes",
      config: {
        title: "Settings",
        active_card_types: "Active card types",
        show_normal_font: "Also show graphs with normal font",
        show_synonyms: "Show meaning question L2 synonyms",
        show_daily_progress: "Show daily progress information",
        show_l2_length_hint: "Show L2 length hint",
        show_recents: "Show recent phrases",
        filter_unsure: "Filter fallback words",
        day_starts_hour: "Day start hour (0 to 23)",
        bad_review_wait_minutes: "Bad review wait mins (1 to 300)",
        max_new_cards_per_day: "Max new p/d (0 to 10000)",
        max_new_revisions_per_day: "Max new revisions p/d (0 to 10000)",
        manual_selection: "Manual Review Selection",
        source_wordlists: "Source word lists",
        new_card_ordering: "New Card Ordering",
        filter_revisions_by_list: "Filter Revisions by list",
        preferred_meaning_provider: "Preferred meaning provider",
      },
      hanzi_writer_help:
        "Remember the word and draw it here with a mouse or touchscreen, or even better use a pen and paper!",
      settings_incomplete: "Settings incomplete, please configure",
      personalising_cards: "Calculating Personalised Cards",
      show_answer: "Show Answer",
      progress_new: `New: (%{completedNewToday}) %{newToday} / %{maxNew} (%{availableNewToday} available)`,
      progress_revisions: `Revisions: (%{completedRevisionsToday}) %{revisionsToday} / %{maxRevisions} (%{allRevisionsToday} due)`,
      progress_new_short: `New: (%{completedNewToday}) %{newToday}/%{maxNew} (%{availableNewToday} avail)`,
      progress_revisions_short: `Rev: (%{completedRevisionsToday}) %{revisionsToday}/%{maxRevisions} (%{allRevisionsToday} due)`,
    },
    signup: {
      learn: "I want to learn",
    },
    stats: {
      name: "My Stats",
      title: "My stats: reflect on progress",
      known_elements: "Known words and characters (totals)",
      seen_looked_up: "Words seen and looked up (rates)",
      actively_revised: "Words actively revised (rates)",
      revisions_waiting: "Revisions waiting (totals)",
      generating: "Stats are still being generated",
      no_revision_stats: "There are no revision stats available",
      no_read_stats: "There are no read stats available",
      no_revised_stats: "There are no revised stats available",
      no_list_stats: "There are no list stats available",
      total_revisions_waiting: "Pending revisions (total)",
    },
    studentstats: {
      name: "Student Stats",
      classes: "Classes",
      no_class: "Select a class",
      class_selector: "Select a class",
      students: "Students",
      no_student: "Select a student",
      student_selector: "Select a student",
    },
    system: {
      name: "Global Settings",
      initialise: "Get Started!",
      refresh_caches: "Refresh caches (Instant)",
      caches_cleared: "Cleared the caches: %{cacheNames}",
      reload_db: "Reload DB (Almost Instant)",
      purge_invalid_recents: "Purge invalid recent sentences (Quick)",
      refresh_db_from_server: "Refresh DB from server (Up to 10 mins)",
      quickfix_actions: "Quick-fix actions",
      user_preferences: "User Preferences",
      dark_mode: "Dark Mode",
      deleting_database: "Deleting the databases",
      server_available: "Server contacted successfully at ",
      server_unavailable: "Server not available at ",
      waiting_for_server: "Waiting to contact server",
      system_info: "System Information",
    },
    textcrobes: {
      name: "Textcrobes",
      settings: "Textcrobes Settings",
      enrich_error: "Error enriching the text.",
      too_many_words: `The editor has a character limit of %{maxTextLength}. Please delete text before adding more.
        If your text is longer than this, please put the text content in a .txt file in plain text format
        and import using the import system.`,
      type_something_here: "Type something here...",
      input_label: "Text to Transcrobe",
    },
  },
};

export default customEnglishMessages;
