import { TranslationMessages } from "react-admin";
import chineseMessages from "./zhBase";

const customChineseMessages: TranslationMessages = {
  ...chineseMessages,
  unsupported: {
    title: "不支持的浏览器",
    chrome_version: "版本 111+ 支持与 Chromium 兼容的浏览器。请更新至最新版本的浏览器。",
    opera_version: "Opera Desktop 支持 98+ 版本和 Android 74.3+（以及 iOS 16.4+）。请将 Opera 更新到最新版本。",
    firefox_version: "支持 Firefox 版本 112+。 请将 Firefox 更新至最新版本。",
    safari_version: "支持 iOS 16.4+ 和 macOS 13.3+ 上的 Safari。请更新您的操作系统或使用其他设备。",
    webview_version: "不受支持。请在普通浏览器窗口中打开应用程序，或使用 Play Store 版本。",
    message:
      "Transcrobes 在 Apple App Store 或 Android Play Store 中完全支持的应用程序之一或 Google Chrome、Microsoft Edge、Opera 或桌面（Windows、Linux 和 Mac）或 Android 上的其他基于 Chromium 的浏览器上运行效果最佳。Firefox 应该也可以在桌面和 Android 上运行，但可能比基于 Chromium 的浏览器慢。 在 Mac 上，您还可以使用 Apple 的 Safari 浏览器。",
    message_ios: "在 iOS 上，您目前可以使用 Safari 或 Opera。我们正在努力为 iOS 支持其他浏览器。",
    message_rest: "我们正在努力为所有平台带来兼容性。同时，请使用其中一种受支持的浏览器。谢谢。",
    button: "下载微软 Edge",
  },
  pos: {
    en_treebank: {
      PU: "标点",
      ADD: "其他",
      AFX: "词缀",
      HYPH: "连字符",
      GW: "随之而来",
      XX: "其他",
      NFP: "其他",
      CC: "协调连词",
      CD: "基数",
      DT: "决定者",
      EX: "存在的_there_",
      FW: "外来词",
      IN: "介词或从属连词",
      JJ: "形容词",
      JJR: "形容词,比较级",
      JJS: "形容词,最高级",
      LS: "列表项标记",
      MD: "模态",
      NN: "名词,单数或质量",
      NNS: "名词,复数",
      NNP: "专有名词,单数",
      NNPS: "专有名词,复数",
      PDT: "预定者",
      POS: "所有格结尾",
      PRP: "人称代词",
      PRP$: "所有格代词",
      RB: "副词",
      RBR: "副词,比较",
      RBS: "副词,最高级",
      RP: "粒子",
      SYM: "符号",
      TO: "_to_",
      UH: "欹",
      VB: "动词,基本形式",
      VBD: "动词,过去时",
      VBG: "动词、动名词或现在分词",
      VBN: "动词,过去分词",
      VBP: "动词,非第三人称单数现在时",
      VBZ: "动词,第三人称单数现在时",
      WDT: "Wh-确定器",
      WP: "Wh-代词",
      WP$: "所有格 wh-代词",
      WRB: "Wh-副词",
    },
    simple: {
      NOUN: "名词",
      VERB: "动词",
      ADJ: "形容词",
      ADV: "副词",
      PREP: "介词",
      PRON: "代词",
      CONJ: "连词",
      DET: "限定词",
      MODAL: "情态词",
      OTHER: "其他",
    },
    zh_treebank: {
      AD: "副词", // adverb
      AS: "方面标记", // aspect marker
      BA: "把", // in ba-construction ,
      CC: "并列连词", // coordinating conjunction
      CD: "基数", // cardinal number
      CS: "从属连词", // subordinating conjunction
      DEC: "的-关系从句", // in a relative-clause
      DEG: "的-联想", // associative
      DER: "的-动词-的-结果", // in V-de const. and V-de-R
      DEV: "的-动词前", // before VP
      DT: "限定词", // determiner
      ETC: "“等”标记", // for words , ,
      FW: "外来词", // foreign words
      IJ: "欹", // interjection
      JJ: "形容词", // other noun-modifier ,
      LB: "长的“被”", // in long bei-const ,
      LC: "定位器", // localizer
      M: "量词", // measure word
      MSP: "其他词粒子", // other particle
      NN: "普通名词", // common noun
      NR: "专有名词", // proper noun
      NT: "时间名词", // temporal noun
      OD: "序数词", // ordinal number
      ON: "象声词", // onomatopoeia ,
      P: "介词（不包括“和”）", // preposition excl. and
      PN: "代词", // pronoun
      PU: "标点", // punctuation
      SB: "短的“被”", // in short bei-const ,
      SP: "词尾粒子", // sentence-final particle
      VA: "表语形容词", // predicative adjective
      VC: "系动词",
      VE: "“有”作为主要动词", // as the main verb
      VV: "其他动词", // other verb
      // Others added since then
      URL: "网址",
    },
  },
  user: {
    help: {
      site: "网站信息",
    },
    login: {
      messages: {
        "001": "电子邮件验证成功",
        "002": "电子邮件验证错误，请联系 %{admin_emails}",
        "003": "电子邮件验证已过期，请联系 %{admin_emails}",
      },
    },
    signup: {
      label: "创建一个账户",
      error: "创建账户时出错，请稍后再试",
      email_success: "已发送帐户创建电子邮件，请检查您的电子邮件",
      email_success_long: "验证电子邮件已发送到提供的电子邮件地址。 请通过单击电子邮件中的链接来验证此电子邮件。",
      consent_a: "我同意",
      consent_b: "研究同意条款",
    },
    email: "电子邮件",
    invalid_email: "无效的电子邮件地址",
    email_validated: "电子邮件验证成功，请登录！",
    validate_email_error: "验证电子邮件时出错，请在几分钟后再试",
    validating_email: "请等待系统验证您的电子邮件",
    reset_password: {
      label: "重设密码",
      recover: "发送重置电子邮件",
      error: "重置密码时出错，请稍后再试",
      email_success: "已发送重置电子邮件，请检查您的电子邮件",
      success: "密码重置成功，请使用新密码登录",
      password: "密码",
      repeat_password: "重复密码",
      passwords_different: "密码不同",
      token_missing: "无效的重置URL",
    },
  },
  buttons: {
    general: {
      online_help: "在线帮助",
      watch_demo: "观看演示",
      say_it: "说",
      download: "下载",
      back_to_netflix: "回到 Netflix",
      back_to_youku: "回到优酷",
    },
  },
  general: {
    coming_soon: "敬请期待",
    voice_available: "点击以 %{language} 说出单词",
    voice_not_available: "未安装 %{language} 语音支持",
    pos_unknown: "词性不明",
    default: "默认",
    upload: "上传",
  },
  database: {
    retrieving_files: "检索数据文件：完成 1%",
    files_downloaded: "数据文件已下载，加载到数据库：完成13%",
    files_loaded: "数据文件已加载到数据库中：已完成 93%",
    synchronised: "集合已同步：已完成 98%",
    synchronising: "正在同步 %{filename} ： %{percent}% 完成",
    init_finished: "索引现已生成。初始化已完成！： 100% 完成",
    importing: "正在导入文件 %{i} ： 初始化 %{percent}% 完成",
    updating_indexes: "更新索引：初始化完成 90%",
    cache_exports_error:
      "下载数据文件时出错。请完全关闭浏览器，并在几分钟后重试，如果您再次收到此消息，请联系 Transcrobes 支持：错误！",
    datafile: "检索到的数据文件： %{datafile}",
    getting_cache_list: "正在检索缓存列表",
    init_temp_storage: "初始化临时存储",
    init_storage: "初始化存储",
    reinstalling: "重新安装数据库",
    init_structure: "初始化数据库结构",
  },
  widgets: {
    beginners: {
      title: "你已经知道哪些单词了？",
      intro: "为了有用，Transcrobes 需要知道您已经知道的单词。",
      button_interface: "使用界面",
      button_import: "导入文件",
      button_later: "稍后（不推荐）",
    },
    content_value_analysis: {
      title: "Personalised value analysis",
      help_title: "针对所选目标显示内容学习价值的个性化分析",
      header_items: "项目",
      header_unknown_total: "未知/总计",
      header_ratio: "比率",
      number_of_words: "单词数",
      number_of_found: "找到的字数",
      number_of_not_found: "未找到的字数",
      percent_useful_words: "有用的未知词百分比",
      types: "不同的项目（类型）",
      tokens: "物品（代币）",
    },
    content_analysis: {
      title: "个性化分析",
      help_title: "显示内容中已知和未知词的个性化分析",
      header_items: "项目",
      header_known_total: "已知/总计",
      header_ratio: "比率",
      number_of_characters: "字符数",
      number_of_words: "单词数",
      avg_sentence_length: "平均句子长度（字）",
      types: "不同的项目（类型）",
      tokens: "物品（代币）",
    },
    meaning_editor: {
      type_something_here: "在这里输入一些东西...",
    },
    popup: {
      recent_sentences: "最近的句子",
      synchronising: "新词同步中，请稍候",
      gloss_now: "马上光泽",
      dont_gloss_now: "现在不要亮",
      saving_cards: "保存卡片中",
      translating: "翻译中",
      no_hsk: "没有找到HSK，",
      hsk_level: "HSK: %{hsk}，",
    },
    card_type: {
      graph: "图表",
      sound: "声音",
      meaning: "意思",
      phrase: "短语",
    },
    fine_control: {
      raw: {
        more: "增加 %{amount}",
        less: "减少 %{amount}",
      },
      percent: {
        more: "增加 %{amount}%",
        less: "减少 %{amount}%",
      },
    },
    dictionary_provider: {
      title: "字典提供商",
      selected: "已选择",
      unselected: "未选择",
    },
    gloss_font_override: {
      font_family: "字体",
      gloss_font_family: "光泽字体",
      manual_font_selection: "手动字体选择",
    },
    main_text_override: {
      font_family: "字体",
      gloss_font_family: "词汇字体",
      main_font_family: "主字体",
      manual_font_selection: "手动选择字体",
      font_size: "字体大小",
      text_colour: "文本颜色",
      override_text_colour: "覆盖文本颜色",
      override_type: {
        none: "无",
        coloured: "颜色",
        tones: "音调",
      },
    },
    reader_config: {
      gloss_colour_title: "释义颜色",
      gloss_colour_label: "覆盖光泽颜色",
      gloss_unsure_colour: "覆盖不确定的光泽背景颜色",
      gloss_font_size: "覆盖字体大小",
      glossing_type: {
        title: "上光类型",
        none: "无",
        simpler: "简单",
        sounds: "声音",
        l1: "母语",
        sounds_l1: "声音和母语",
      },
      glossing_position: {
        title: "光泽位置",
        after: "在后面",
        above: "在上面",
        below: "在下面",
        before: "在前面",
      },
      segmentation: {
        title: "分割",
        none: "无",
        segmented: "分割",
      },
      mouseover: {
        title: "鼠标悬停",
        none: "无",
        display_mouseover: "显示鼠标悬停",
      },
      say_on_mouseover: {
        title: "鼠标悬停时说",
        none: "无",
        say: "鼠标悬停时说",
      },
      recent_phrases: {
        title: "收集最近的短语",
        on: "开",
        off: "关",
      },
      strict_provider_ordering: {
        title: "严格的提供程序排序",
        on: "开",
        off: "关",
      },
    },
    content_actions: {
      read: "阅读",
      watch: "观看",
      enrich: "丰富",
      resubmit: "重新提交",
    },
    practicerInput: {
      unknown_desc: "我还不知道这个词",
      hard_desc: "我对这个词没有信心",
      good_desc: "我对这个词很满意",
      known_desc: "我知道这个词，我不需要再修改它",
    },
    grades: {
      hard: "添加已知（差）",
      unknown: "计划学习",
      good: "添加已知",
      known: "添加为已知（无修订）",
    },
    set_knowledge: {
      dont_set: "不设置",
      hard: "已知（差）",
      unknown: "未知",
      good: "已知（好）",
      known: "已知（无修订）",
    },
    order_by: {
      absolute_frequency: "绝对频率",
      import_frequency: "导入频率",
    },
    processing: {
      none: "无",
      requested: "请求中",
      processing: "处理中",
      finished: "完成",
      error: "错误",
    },
    process_type: {
      vocabulary_only: "只有词汇",
      grammar_only: "只有语法",
      vocabulary_and_grammar: "词汇和语法",
    },
    content_type: {
      book: "书",
      video: "视频",
    },
    subwords: {
      title: "子词",
    },
    word_order_selector: {
      ordering: "单词顺序",
      personal: "个性化",
      natural: "进口订单/频率",
      wcpm: "字数/百万",
    },
  },
  stats: {
    nb_seen: "已看到",
    nb_checked: "已检查",
    nb_successes: "成功",
    nb_re_revisions: "再次复习",
    list_progress: {
      words_types: "单词（类型）",
      chars_types: "字符（类型）",
    },
    content_progress: {
      words_types: "单词（类型）",
      chars_types: "字符（类型）",
      words_tokens: "单词（标记）",
      chars_tokens: "字符（标记）",
      avg_sentence_length: "平均句子长度",
      missing_stats: "缺少统计信息",
      generating_stats: "正在生成统计信息",
      grammar_patterns: "语法模式",
    },
    frequency: {
      title: "词频：",
      description: "Subtlex Open Subtitles 数据库中的频率",
      wcpm_description: "每百万字数",
      wcdp_description: "出现该词的所有电影的百分比",
    },
  },
  resources: {
    contents: {
      name: "内容",
      fields: {
        title: "标题",
        description: "描述",
        processing: "处理中",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        theImport: "源导入",
        contentType: "内容类型",
        shared: "共享",
        lang: "语言",
        cover: "封面",
        author: "作者",
      },
      progress: "进度",
      contentStats: "内容统计",
      value: "词汇价值",
      processingStatus: "处理状态",
      action: "动作",
      offline: "离线？",
      empty_list: "导入的内容会出现在这里",
      goals: "目标",
      no_goal: "没有任何",
      goal_selector: "显示目标的预期内容效用",
      loading: "加载中...",
      import_create: "+ 导入内容",
    },
    goals: {
      name: "目标",
      fields: {
        title: "标题",
        description: "描述",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        status: "活跃",
        priority: "优先级",
        parent: "父",
        userList: "用户列表",
      },
      progress: "进度",
      no_goals_message_a: "目标是从",
      no_goals_message_b: "用户列表",
      no_goals_message_c: "你首先需要",
      no_goals_message_d: "创建一个列表",
      no_goals_message_e: "，然后回到这里。",
      create_goals_now: "现在创建目标",
    },
    imports: {
      name: "导入",
      fields: {
        title: "标题",
        description: "描述",
        processType: "导入类型",
        shared: "共享",
        processing: "处理中",
        createdAt: "创建时间",
        importFile: "导入文件",
      },
      create: {
        form_description_a: "导入文件必须是",
        form_description_b: "文件。请查看专门的",
        form_description_c: "有关导入格式的更多信息！",
      },
      progress: "进度",
      contentStats: "内容统计",
      processingStatus: "处理状态",
    },
    languageclasses: {
      name: "语言班",
      fields: {
        title: "标题",
        description: "描述",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        status: "活跃",
      },
      classParticipants: "班级参与者",
      teachers: "老师",
      students: "学生",
    },
    studentregistrations: {
      name: "课程",
      fields: {
        title: "标题",
        description: "描述",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        status: "活跃",
      },
      empty_list: "教师会邀请您加入他们的课程，注册信息会显示在此处。",
    },
    surveys: {
      name: "调查",
      fields: {
        title: "标题",
      },
    },
    userdictionaries: {
      name: "字典",
      fields: {
        title: "标题",
        description: "描述",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        translations: "翻译",
      },
      saving_dictionary: "正在保存字典",
      changes_saved: `字典已保存`,
      loading_entries: "加载现有的字典条目",
      loading_existing: "正在加载现有字典",
      column_separator: "列分隔符",
      meaning_sound_separator: "意思/声音分隔符",
      quote_character: "引号字符",
      escape_character: "转义字符",
      contains_header_row: "包含标题行",
      import_preview: "导入预览",
      import_valid_entries: "有效的导入条目",
      existing_entries: "现有条目",
      filter: "过滤",
      import: "字典导入",
      invalid_entries: "无效的导入条目（忽略）",
      sounds: "语音",
      graph: "图表",
    },
    userlists: {
      name: "用户列表",
      fields: {
        title: "标题",
        description: "描述",
        processType: "导入类型",
        processing: "处理中",
        shared: "共享",
        theImport: "源导入",
        createdAt: "创建时间",
        updatedAt: "更新时间",
        nbToTake: "要采取的数量",
        orderBy: "排序方式",
        minimumAbsFrequency: "最小绝对频率",
        minimumDocFrequency: "最小文档频率",
        wordKnowledge: "单词知识",
      },
      processingStatus: "处理状态",
      setWordKnowledge: "设置单词知识",
      progress: "进度",
      nb_unique_words_in_list: "列表中的唯一单词数",
    },
  },
  screens: {
    boocrobes: {
      name: "Boocrobes",
      config: {
        title: "设置",
        fullscreen: "全屏",
        table_of_contents: "目录",
        back_to_contents: "返回目录",
        paging: {
          title: "分页",
          paginated: "分页",
          scrolling: "滚动",
        },
        page_margins: "页面边距",
      },
      previous: "上一页",
      next: "下一页",
    },
    brocrobes: {
      name: "Brocrobes",
      text_a: `Brocrobes 是一个浏览器扩展，兼容 Google Chrome、Microsoft Edge 和其他 Chromium 衍生的浏览器，用于在 Netflix
        和优酷上阅读网页和观看视频的个性化帮助！`,
      text_b: "从以下位置下载 Brocrobes：",
      text_b_chrome: "Chrome 网上应用店（目前在中国大陆不可用）",
      text_b_edge: "Microsoft Edge Store（目前中国大陆可用）",
      text_b_direct: "直接下载插件（中国大陆安卓版Kiwi浏览器使用）",
      text_c: `Brocrobes 将 Transcrobes 的强大功能带到了网络上的每个页面，让您在任何地方都可以在此应用程序中获得同样的舒适感。`,
      text_d: `主要的 Android 浏览器供应商不支持移动设备上的扩展，但您*可以*使用 Kiwi 浏览器。`,
      text_e: "下载 Kiwi 浏览器：",
      text_e_play: "Google Play 上的 Kiwi 浏览器",
      text_e_direct: "直接下载（APK文件）",
    },
    exports: {
      name: "导出",
      title: "数据导出",
      per_word_activity: "导出每个单词的活动数据",
      per_day_activity: "导出每日活动数据",
      all_card_data: "导出所有 Repetrobes 卡数据",
    },
    extension: {
      title: "Transcrobes 服务器连接设置",
      loading_message: "正在从本地数据库加载配置...",
      save_warning: "进行更改后不要忘记点击保存（在底部）！",
      login_error: `登录 %{baseUrl} 时出错。 \n\n请检查登录详细信息，或稍后重试。`,
      sync_error: "启动初始同步时出错。 请稍后再试。",
      error: `设置 Transcrobes 时出错。 请稍后再试，或联系 Transcrobes 支持（<a href="http://%{docs_domain}/page/contact/">此处</a>）`,
      init_complete: "初始化完成！",
      update_complete: "更新完成！",
      saving_now: "保存选项，请稍候并保持此窗口打开...",
      form_email: "电子邮件",
      form_password: "密码",
      form_server: "服务器",
      show_suggestions: "显示建议？",
      show_research_details: "显示研究详细信息？",
      import: {
        title: "将 EPUB 导入 Transcrobes",
        checking: "正在检查 %{linkUrl} 是否有有效的 EPUB 文件...",
        sending: "正在将 %{linkUrl} 发送到 Transcrobes 服务器...",
        link_error: "错误：%{linkUrl} 没有指向 EPUB 文件 (%{destUrl})",
        started: "EPUB 导入已成功发送到服务器，请检查您的导入页面以了解进度。",
      },
      initialisation: {
        title: "欢迎！ 现在是 Transcrobes 初始化时间！",
        intro_a: `Transcrobes 完全基于浏览器，但需要下载大量参考数据以节省带宽并显着提高性能，这需要一段时间（3-10 分钟，具体取决于您的手机/平板电脑/计算机的速度） 是）。`,
        intro_b: `系统需要做很多工作，所以如果您的设备有点发热并且风扇打开，请不要惊慌。 这是正常的，并且只会在初始化时发生一次。 最好不要在初始化过程中中断初始化，因此请确保您的设备有足够的电池或已插入电源。它还会下载 25-50MB 的数据，因此如果您不在 wifi 上，请确保这不是问题 为您的数据计划。`,
        update: "更新设置",
        update_message: `保存更新的设置应该只需要几秒钟，除非您要更改用户名。 如果您更改用户名并遇到问题，您可能需要重新安装扩展程序（删除并再次添加）。`,
        started: "初始化",
        started_message: `初始化完成时请耐心等待。 初始化将提供一些更新，但您不必担心，除非您在 5 分钟内没有看到任何更新。
          如果您通过导航离开或关闭浏览器来停止初始化，则不会造成任何伤害。 初始化将在您返回时从中断处继续。`,
      },
      missing_account: `您需要 Transcrobes 服务器上的帐户才能转译页面。 \n\n
          如果您有帐户，请使用您的登录信息（用户名、密码、服务器 URL）填写选项页面（右键单击 Transcrobe Me! 图标 -> 扩展选项）。\n\n
          请参阅 Transcrobes 网站 http://%{docs_domain} 了解更多信息`,
      waiting_for_load: "等待页面加载...",
      popup_theme_mode: {
        title: "弹出主题模式",
        light_mode: "灯光模式",
        dark_mode: "黑暗模式",
      },
      page: {
        title: "Transcrobe 网页",
      },
      page_analysis: {
        title: "页面分析",
        off: "关闭",
        top_right: "右上角",
        bottom_right: "右下角",
      },
      selection: {
        title: "Transcrobe 选定的文本",
      },
      streamer: {
        looking_for_subs: "正在寻找字幕",
        processing_subs: "正在处理字幕",
        sub_content_error: "订阅内容错误",
        no_available_subs: "没有可用的字幕",
        bad_subs_lang: "字幕语言错误",
        no_id: "没有 ID",
        no_data: "没有数据",
        buffering: "缓冲...",
      },
    },
    help: {
      name: "帮助！",
      title: "转录帮助中心",
      text_a: "Transcrobes 信息站点有 Transcrobes 平台的用户文档。",
      text_b: "在这里找到它。",
      text_c: `该软件的所有主要功能都有一个 YouTube 频道和演练视频播放列表。`,
      text_d: `在 Twitter 或 Discord 上与 Transcrobes 社区联系。`,
      text_e: `对于在线文档中未涵盖的任何内容或对软件、理论或研究的任何意见、问题或建议，请联系首席研究员和开发人员 Anton Melser`,
      text_f: `Transcrobes 也是一个活跃的学术研究项目。 该软件背后的理论的关键方面在文档站点上进行了概述。`,
      text_g: `了解更多。`,
      youtube_channel: "YouTube 频道",
      playlist: "演练视频的播放列表",
    },
    initialisation: {
      title: "欢迎！现在是Transcrobes初始化时间！",
      intro: `尽管 Transcrobes 完全基于浏览器，但 Transcrobes 的许多功能都可以离线使用（它是一个“渐进式 Web 应用程序”），这意味着无论您身在何处，您都可以继续阅读您喜爱的书籍、观看您喜爱的电影或进行主动学习练习 ， 无论你什么时候想要。 这确实意味着系统需要下载和准备一些东西，这将需要一段时间（3-10 分钟，具体取决于您的手机/平板电脑/计算机的速度）。`,
      started: "初始化",
      started_message: `请耐心等待初始化完成。 初始化会提供一些更新，但您不必担心，除非超过 5 分钟没有看到更新。`,
    },
    listrobes: {
      name: "Listrobes",
      minimum_training_complete: "完成最低限度的培训。 继续培训或开始使用该平台！",
      percent_training_complete: "告诉系统你知道的单词（%{percent_complete} 完成）",
      minimum_entry_complete: {
        title: "最低建议培训完成",
        message: `现在您已经向系统介绍了一些关于您自己的信息，您可以开始使用该平台了。
          如果您仍然知道很多单词，您可以现在继续训练，或者稍后再回来完成。
          要开始阅读，我们建议您试用 Chrome 浏览器扩展程序 Brocrobes，或者如果您想输入或粘贴文本，您可以试用 Textcrobes。`,
        continue_training: "继续训练",
        try_brocrobes: "尝试 Brocrobes",
        try_textcrobes: "尝试 Textcrobes",
      },
      config: {
        title: "Listrobes配置",
        advanced: "高级模式",
        source_word_lists: "源单词列表",
        items_per_page: "每页项目（1 到 250）",
        invalid_number: "无效的数字",
        default_click_order: "默认点击顺序",
        no_options: "没有选项",
        loading: "加载中...",
        placeholder: "选择...",
      },
      vocab_item_sound: "语音：",
      vocab_item_meaning: "词义：",
      finished: "没有剩余的词汇项目",
    },
    moocrobes: {
      name: "Moocrobes",
      load_video_file: "加载视频文件",
      fullscreen: "全屏",
      config: {
        title: "设置",
        central_controls: {
          previous_sub: "上一个字幕",
          next_sub: "下一个字幕",
          play: "播放",
          pause: "暂停",
          skip_back: "后退",
          skip_forward: "前进",
        },
        subs_position: {
          title: "字幕位置",
          top: "顶部",
          bottom: "底部",
          under: "下面",
        },
        subs_box_width: {
          title: "字幕框宽度",
          minus: "减少 5%",
          plus: "增加 5%",
        },
        subs_synchronisation: {
          title: "字幕同步",
          minus: "0.5秒前",
          plus: "0.5秒后",
        },
        subs_background_blur: {
          title: "字幕背景模糊",
          none: "无",
          blur: "模糊",
        },
        playback_rate: {
          title: "播放率",
          minus: "减速 5%",
          plus: "加速 5%",
        },
        subtitle_playback_rate: {
          title: "字幕播放率",
          minus: "减速 5%",
          plus: "加速 5%",
        },
        subs_raise: {
          title: "升起字幕",
        },
        volume_boost: {
          title: "音量增强",
        },
      },
    },
    main: {
      search: "搜索",
      configuration: "配置",
      system: "全局设置",
      help: "帮助!",
      language: "语言",
      theme: {
        name: "主题",
        light: "亮色",
        dark: "暗色",
      },
      dashboard: {
        welcome: {
          title: "欢迎来到Transcrobes!",
          subtitle: "通过做你喜欢的事情学习语言。",
          message_a: "探索应用程序并使用专用的",
          message_b: "按钮获取每个页面的帮助。",
        },
        goals: {
          title: "目标进度",
        },
        word_chars_progress: {
          title: "已知单词和字符（总数）",
        },
      },
      menu: {
        input: "输入",
        organisation: "组织",
        learning: "学习",
        surveys: "调查",
        teaching: "教学",
      },

      finishing: "正在完成初始索引加载...",
    },
    notrobes: {
      name: "Notrobes",
      title: "Notrobes： 词汇搜索，发现单词",
      show_related: "显示相关词",
      card_revision_details: "卡片修订细节",
      card_actions: "卡片操作",
      existing_cards: "现有卡片",
      type: "类型",
      due_date: "到期日期",
      known: "已知？",
      no_cards: "没有卡片",
      lists: "列表（名称：列表中的频率位置）",
      no_lists: "没有此项目的列表",
      radicals: "激进分子和组成",
      no_radicals: "未找到角色详细信息",
      related_words: "相关词",
      only_simplified_chars: "只允许英文字符",
      no_related_words: "没有相关词",
      short_word_list: {
        id: "ID",
        sounds: "语音",
      },
      personal_word_stats: {
        title: "个人单词统计",
        nb_seen: "看到的数量：",
        last_seen: "最后一次看到：",
        nb_seen_since_last_check: "自上次检查以来看到的数字：",
        nb_checked: "检查号码：",
        last_checked: "最后检查：",
        no_word_stats: "没有单词统计信息",
      },
      entry_definitions: "条目定义",
      metadata: "元数据",
      recently_seen_phrases: "最近看到的短语",
      no_recently_seen_phrases: "没有找到最近的短语",
      no_results: "没有搜索结果。 请尝试新的搜索",
      no_network: "获取数据失败。 请检查网络",
      cards_recorded: "记录的卡片",
      only_simplified: "只能搜索简体字",
      no_traditional: "系统暂不支持繁体字",
      query_max_length: "系统只处理最多 %{max_chars} 个字符的单词",
      common_only: "只显示最常见的词",
      by_chars: "按字母",
      by_sound: "按声音",
      by_radical: "按根本",
      loading_related: "初始化相关数据索引（15-60 秒）",
    },
    repetrobes: {
      name: "Repetrobes",
      config: {
        title: "设置",
        active_card_types: "活动卡片类型",
        show_normal_font: "还显示具有正常字体的图形",
        show_synonyms: "显示意义问题 L2 同义词",
        show_daily_progress: "显示每日进度信息",
        show_l2_length_hint: "显示 L2 长度提示",
        show_recents: "显示最近的短语",
        day_starts_hour: "日开始时间（0 到 23）",
        bad_review_wait_minutes: "差评等待分钟（1 到 300）",
        max_new_cards_per_day: "每天最大新增数量（0 到 10000）",
        max_new_revisions_per_day: "每天的最大新修订数（0 到 10000）",
        manual_selection: "人工审核选择",
        source_wordlists: "源词表",
        new_card_ordering: "新卡订购",
        filter_revisions_by_list: "按列表过滤修订",
        preferred_meaning_provider: "首选含义提供者",
      },
      hanzi_writer_help: "记住单词并使用鼠标或触摸屏在此处绘制，或者更好地使用笔和纸！",
      settings_incomplete: "设置不完整，请配置",
      show_answer: "显示答案",
      progress_new: `新词: (%{completedNewToday}) %{newToday} / %{maxNew} (%{availableNewToday} 可用)`,
      progress_revisions: `修订: (%{completedRevisionsToday}) %{revisionsToday} / %{maxRevisions} (%{allRevisionsToday} 到期的)`,
      progress_new_short: `新词: (%{completedNewToday}) %{newToday}/%{maxNew} (%{availableNewToday}可用)`,
      progress_revisions_short: `修订: (%{completedRevisionsToday}) %{revisionsToday}/%{maxRevisions} (%{allRevisionsToday}到期的)`,
    },
    signup: {
      learn: "我想学习",
    },
    stats: {
      name: "统计",
      title: "我的统计数据：反思进展",
      known_elements: "已知单词和字符（总数）",
      seen_looked_up: "看到和查找的单词（比率）",
      actively_revised: "积极修改的词（比率）",
      revisions_waiting: "等待修订（总计）",
      generating: "正在生成统计信息",
      no_revision_stats: "没有可用的修订统计信息",
      no_read_stats: "没有可用的阅读统计信息",
      no_revised_stats: "没有可用的修订统计信息",
      total_revisions_waiting: "等待修订（总计）",
    },
    studentstats: {
      name: "学生统计",
    },
    system: {
      name: "系统",
      initialise: "初始化",
      refresh_caches: "刷新缓存（即时）",
      caches_cleared: "清除缓存：%{cache_names}",
      reload_db: "重新加载数据库（几乎即时）",
      purge_invalid_recents: "清除最近无效的句子（快）",
      refresh_db_from_server: "从服务器刷新数据库（最多 10 分钟）",
      quickfix_actions: "快速修复操作",
      user_preferences: "用户偏好",
      dark_mode: "黑暗模式",
      deleting_database: "删除数据库",
      server_available: "服务器联系成功",
      server_unavailable: "服务器不可用",
      waiting_for_server: "等待联系服务器",
      system_info: "系统信息",
    },
    textcrobes: {
      name: "Textcrobes",
      settings: "Textcrobes设置",
      enrich_error: "丰富文本时出错。",
      too_many_words: `编辑器的字符限制为 %{max_text_length}。 请在添加更多内容之前删除文本。
        如果您的文本超过此长度，请将文本内容以纯文本格式放入 .txt 文件中，并使用导入系统导入。`,
      type_something_here: "在这里输入一些东西...",
      input_label: "要Transcrobe的文本",
    },
  },
};

export default customChineseMessages;
