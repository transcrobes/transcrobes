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
  },
  widgets: {
    beginners: {
      title: "What words do you know already?",
      intro: "To be useful Transcrobes needs to know what words you know already.",
      button_interface: "Use the interface",
      button_import: "Import a file",
      button_later: "Later (not recommended)",
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
    meaning_editor: {
      type_something_here: "Type something here",
    },
    popup: {
      recent_sentences: "Recent sentences",
      synchronising: "New word synchronising, please wait",
      gloss_now: "Gloss right now",
      dont_gloss_now: "Don't gloss right now",
      saving_cards: "Saving Cards...",
      translating: "Translating...",
    },
    card_type: {
      graph: "Graph",
      sound: "Sound",
      meaning: "Meaning",
      phrase: "Phrase",
    },
    fine_control: {
      more: "Increase %{amount}%",
      less: "Decrease %{amount}%",
    },
    dictionary_provider: {
      title: "Dictionary providers",
      selected: "Selected",
      unselected: "Unselected",
    },
    gloss_font_override: {
      font_family: "Font family",
      gloss_font_family: "Gloss Font family",
      manual_font_selection: "Manual Font Selection",
    },
    main_text_override: {
      font_family: "Font family",
      gloss_font_family: "Gloss Font family",
      main_font_family: "Main text Font family",
      manual_font_selection: "Manual Font Selection",
      font_size: "Font size",
      text_colour: "Text colour",
      override_text_colour: "Override text colour",
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
    content_actions: {
      read: "Read",
      watch: "Watch",
      enrich: "Enrich",
      resubmit: "Resubmit",
    },
    practicerInput: {
      unknown_desc: "I don't know this word yet",
      hard_desc: "I am not confident with this word",
      good_desc: "I am comfortable with this word",
      known_desc: "I know this word, I don't need to revise it again",
    },
    grades: {
      hard: "Add as known (poorly)",
      unknown: "Plan to learn",
      good: "Add as known",
      known: "Add as known (no revision)",
    },
    set_knowledge: {
      dont_set: "Don't set",
      hard: "Hard",
      unknown: "Unknown",
      good: "Good",
      known: "Known",
    },
    order_by: {
      absolute_frequency: "Absolute Frequency",
      import_frequency: "Frequency in import",
    },
    processing: {
      none: "None",
      requested: "Requested",
      processing: "Processing",
      finished: "Finished",
      error: "Error",
    },
    process_type: {
      vocabulary_only: "Vocabulary Only",
      grammar_only: "Grammar Only",
      vocabulary_and_grammar: "Vocabulary and Grammar",
    },
    content_type: {
      book: "Book",
      video: "Video",
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
      title: "Frequency:",
      description: "Frequency in the Subtlex Open Subtitles database",
      wcpm_description: "Word Count Per Million",
      wcdp_description: "Percentage of all films where the word appears",
    },
  },
  resources: {
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
    userdictionaries: {
      name: "Dictionaries",
      fields: {
        title: "Title",
        description: "Description",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        translations: "Translations",
      },
      saving_dictionary: "Saving Dictionary",
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
    },
    surveys: {
      name: "Surveys",
      fields: {
        title: "Title",
      },
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
    },
    brocrobes: {
      name: "Brocrobes",
      text_a: `Brocrobes is a browser extension, compatible with Google Chrome, Microsoft Edge,
        and other Chromium-derived browsers for reading webpages.`,
      text_b: "You can download Brocrobes on the Chrome Web Store",
      text_c: `Brocrobes brings the power of Transcrobes to every page on the web,
        giving you the same comfort you get inside this application everywhere.`,
      text_d: `The main browser vendors don't support extentions on mobile (yet?) but you *can* use the
            on Android (though it will likely be a little slower than on the desktop). We are working with Yandex
            support to allow for support of Yandex Mobile at a future date.`,
      text_e: "Download the Kiwi Browser",
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
        Please try again in a little while, or contact Transcrobes support (<a href="http://%{docs_domain}/page/contact/">here</a>)`,
      init_complete: "Initialisation complete!",
      update_complete: "Update complete!",
      saving_now: "Saving the options, please wait and keep this window open...",
      form_email: "Email",
      form_password: "Password",
      form_server: "Server URL",
      show_suggestions: "Show Suggestions?",
      show_research_details: "Show Research Details?",
      initialisation: {
        title: "Welcome! It's Transcrobes initialisation time!",
        intro_a: `Transcrobes is entirely browser-based but needs to download a lot of reference data in order to save on
        bandwidth and dramatically improve performance, and that is going to take a while (3-10 minutes, depending on
        how fast your phone/tablet/computer is).`,
        intro_b: `The system needs to do quite a lot of work, so don't be alarmed if your devices heat up a bit and the fan
        switches on. It's normal, and will only happen once, at initialisation time. It's better to not interrupt the
        initialisation while it's happening, so make sure your device has plenty of battery, or is plugged in. It will
        also download 25-50MB of data so if you are not on wifi, make sure that is not a problem for your data plan.`,
        update: "Update settings",
        update_message: `Saving updated settings should only take a few seconds, unless you are changing your username. You may need to
        reinstall the extension (delete and add again) if you change your username and encounter issues.`,
        started: "Initialisation started",
        started_message: `Please be patient while the initialisation finishes. The initialisation will give some
          updates but you should not be worried unless you see no update for over 5 minutes.
          No harm should come if you stop the initialisation by navigating away or closing the browser.
          The initialisation will pick up where it left off when you return.`,
      },
      popup_theme_mode: {
        title: "Popup Theme Mode",
        light_mode: "Light Mode",
        dark_mode: "Dark Mode",
      },
      page_analysis: {
        title: "Page Analysis",
        off: "Off",
        top_right: "Top Right",
        bottom_right: "Bottom Right",
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
      intro_a: `Transcrobes has been tested and works best on either Google Chrome, Microsoft Edge or Yandex Browser (Chromium-based browsers) on either the desktop (Windows, Linux, Mac) or on Android. Unfortunately, other browsers (including everything on iOS) don't properly support all the latest web standards, so some things might not work properly. We are working hard on bringing compatibility to all platforms.`,
      intro_b: `Even though Transcrobes is entirely browser-based, a lot of Transcrobes' functionality is available offline (it's a "Progressive Web App"), which means you can keep reading your favourite books, watching your favourite movies or doing active learning exercises wherever you are, whenever you want. On a mountain or behind a Great Big Firewall, nothing should get in the way of your learning! This does mean that the system needs to download and prepare some things, and that is going to take a while (3-10 minutes depending on how fast your phone/tablet/computer is).`,
      intro_c: `The system needs to do quite a lot of work (mainly building indexeddb indexes), so don't be alarmed if your devices heat up a bit (should be less than a gaming session though!) and the fan switches on. It's normal, and will only happen once, at initialisation time. It's better to not interrupt the initialisation while it's happening (like any initialisation!), so make sure your device has plenty of battery (or is plugged in). It will also download 25-50MB of data so if you are not on wifi, make sure that is not a problem for your data plan.`,
      started: "Initialisation started",
      started_message: `Please be patient while the initialisation finishes. The initialisation will give some
          updates but you should not be worried unless you see no update for over 5 minutes.
          No harm should come if you stop the initialisation by navigating away or closing the browser.
          The initialisation will pick up where it left off when you return.`,
    },
    listrobes: {
      name: "Listrobes",
      minimum_training_complete: "Minimum training completed. Continue training or start using the platform!",
      percent_training_complete: "Tell the system about the words you know (%{percent_complete} complete)",
      minimum_entry_complete: {
        title: "Minimum recommended training complete",
        message: `Now you've told the system a little about yourself, you can start using the platform.
          If you still know lots of words, you can continue training now, or come back and finish later.
          To start reading we recommend you try out the Chrome browser extension Brocrobes,
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
      },
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
      query_max_length: "The system only handles words of up to %{max_chars} characters",
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
      show_answer: "Show Answer",
      progress_new: `New: (%{completedNewToday}) %{newToday} / %{maxNew} (%{availableNewToday} available)`,
      progress_revisions: `Revisions: (%{completedRevisionsToday}) %{revisionsToday} / %{maxRevisions} (%{allRevisionsToday} due)`,
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
      total_revisions_waiting: "Pending revisions (total)",
    },
    system: {
      name: "Global Settings",
      initialise: "Initialise",
      refresh_caches: "Refresh caches (Instant)",
      reload_db: "Reload DB (Almost Instant)",
      refresh_db_from_server: "Refresh DB from server (Up to 10 mins)",
      quickfix_actions: "Quick-fix actions",
      user_preferences: "User Preferences",
      dark_mode: "Dark Mode",
      deleting_database: "Deleting the databases",
    },
    textcrobes: {
      name: "Textcrobes",
      settings: "Textcrobes Settings",
      enrich_error: "Error enriching the text.",
      too_many_words: `The editor has a character limit of %{max_text_length}. Please delete text before adding more.
        If your text is longer than this, please put the text content in a .txt file in plain text format
        and import using the import system.`,
      type_something_here: "Type something here...",
      input_label: "Text to Transcrobe",
    },
  },
};

export default customEnglishMessages;
