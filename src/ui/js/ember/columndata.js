Dota.ColumnDataMap = {
  allianceshort : [
    {
      name : "name",
      label : "Name",
      type : "textInput",
      sortable : true,
      searchable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      maxlength : "100",
    },
    {
      name : "motto",
      label : "Motto",
      type : "textInput",
      sortable : true,
      searchable : true,
      validations : [
      ],
      maxlength : "200",
    },
  ],
  addmodule : [
    {
      name : "title",
      label : "Title",
      type : "textInput",
      sortable : true,
      searchable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      maxlength : "100",
    },
    {
      name : "type",
      label : "Type",
      type : "staticSelect",
      options : [
        {val : 'module', label : 'Simple List of Data', helpblock : 'Used for a list of simple data with title and description (short)'},
        {val : 'challenge', label : 'Challenge', helpblock : 'Used for list of challenges (Ended challenges appear in the expanded view)'},
        {val : 'member-list', label : 'List Of Members', helpblock : 'Used to show a list of members. Has the option to enable members to add/remove themselves.'},
        {val : 'feed', label : 'Feed', helpblock : 'Used to show a list of messages. Description can be pretty long. Description is hidden, user has to click on title to view it.'},
        {val : 'camp', label : 'Camp Items', helpblock : 'Show a list of camp item hoarding list'},
        {val : 'poll', label : 'Poll', helpblock : 'Poll module'},
      ],
      sortable : true,
      filterable : true,
      disableOnEdit : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "desc",
      label : "Description",
      type : "textareaInput",
      sortable : true,
      searchable : true,
    },
    {
      name : "col",
      label : "Column",
      type : "staticSelect",
      options : [
        {val : 0, label : 'Left Column'},
        {val : 1, label : 'Center Column'},
        {val : 2, label : 'Right Column'},
      ],
      sortable : true,
      filterable : true,
      disableOnEdit : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "restrictedView",
      checkboxLabel : "Restricted View",
      type : "checkBox",
      enableFields : [
        {name : "canViewMembers", disable : false, enable : true},
      ],
    },
    {
      name : "canViewMembers",
      label : "View Only These Members",
      type : "multiEntry",
      validations : [
      ],
      childCol : {
        name : "user_id",
        type : "dynamicSelect",
        prompt : "Select",
        dataValCol : "user_id",
        dataLabelCol : "name",
        dataPath : "GOTAA.GlobalData.members",
        validations : [
          {type : 0, invalidMessage : "Cant be empty"},
        ],
      },
    },
  ],
  module : [
    {
      name : "title",
      label : "Title",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "desc",
      label : "Description",
      type : "textInput",
      sortable : true,
      searchable : true,
    },
  ],
  challenge : [
    {
      name : "title",
      label : "Name",
      type : "dynamicSelect",
      dataValCol : "name",
      dataLabelCol : "name",
      dataPath : "GOTAA.GlobalData.challenges",
      prompt : "Select",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "startsAtString",
      label : "Starts At",
      type : "textInput",
      validations : [
        {type : 2, invalidMessage : "Invalid Date"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "challengeStatus",
      label : "Status",
      type : "staticSelect",
      options : [
        {val : 1, label : 'Yet to start'},
        {val : 2, label : 'Started - Waiting to fill'},
        {val : 3, label : 'Started - Swing Away!'},
        {val : 4, label : 'Ended', enableFields : [
          {name : "firstId", disable : false, enable : true},
          {name : "secondId", disable : false, enable : true},
          {name : "thirdId", disable : false, enable : true},
        ]},
      ],
      sortable : true,
      filterable : true,
      fromFile : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "firstId",
      label : "First",
      type : "dynamicSelect",
      prompt : "None",
      dataValCol : "user_id",
      dataLabelCol : "name",
      dataPath : "GOTAA.GlobalData.members",
      validations : [
        //{type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "secondId",
      label : "Second",
      type : "dynamicSelect",
      prompt : "None",
      dataValCol : "user_id",
      dataLabelCol : "name",
      dataPath : "GOTAA.GlobalData.members",
      validations : [
        //{type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "thirdId",
      label : "Third",
      type : "dynamicSelect",
      prompt : "None",
      dataValCol : "user_id",
      dataLabelCol : "name",
      dataPath : "GOTAA.GlobalData.members",
      validations : [
        //{type : 0, invalidMessage : "Cant be empty"},
      ],
    },
  ],
  feed : [
    {
      name : "title",
      label : "Title",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "desc",
      label : "Description",
      type : "textareaInput",
      sortable : true,
      searchable : true,
    },
    /*{
      name : "image",
      label : "Image",
      type : "imageUpload",
      btnLabel : "Browse",
      method : "ReadAsDataURI",
      accept : "image/*",
    },*/
  ],
  "member-list" : [
    {
      name : "user_id",
      label : "Member",
      type : "dynamicSelect",
      prompt : "None",
      dataValCol : "user_id",
      dataLabelCol : "name",
      dataPath : "GOTAA.GlobalData.members",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "desc",
      label : "Caption",
      type : "textInput",
      validations : [
      ],
      sortable : true,
      searchable : true,
    },
  ],
  poll : [
    {
      name : "title",
      label : "Title",
      type : "textInput",
      sortable : true,
      searchable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "multiVote",
      label : "Multi Vote",
      type : "checkBox",
      validations : [
      ],
      sortable : true,
      searchable : true,
    },
    /*{
      name : "editable",
      label : "Members can edit the vote",
      type : "checkBox",
      validations : [
      ],
      sortable : true,
      searchable : true,
    },*/
    {
      name : "pollOptions",
      label : "Poll Options",
      type : "multiEntry",
      validations : [
      ],
      childCol : {
        name : "title",
        type : "textInput",
      },
    },
  ],
  invite : [
    {
      name : "isDummy",
      checkboxLabel : "Is a placeholder member",
      type : "checkBox",
      enableFields : [
        {name : "email", disable : true, enable : false},
        {name : "gotaname", disable : false, enable : true},
      ],
    },
    {
      name : "gotaname",
      label : "Game Name",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "email",
      label : "Email",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    {
      name : "permission",
      label : "Position",
      type : "staticSelect",
      options : [
        {val : 2, label : 'Leader'},
        {val : 1, label : 'Officer'},
        {val : 0, label : 'Member'},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
  ],
  permission : [
    {
      name : "oprn",
      label : "Operation",
      type : "staticSelect",
      options : [
        {val : "Alliance", label : "Alliance"},
        {val : "Member", label : "Member"},
        {val : "Module", label : "Module"},
        {val : "ModuleData", label : "ModuleData"},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "permission",
      label : "Position",
      type : "staticSelect",
      options : [
        {val : 2, label : 'Leader'},
        {val : 1, label : 'Officer'},
        {val : 0, label : 'Member'},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
  ],
  camp : [
    {
      name : "type",
      label : "Type",
      type : "staticSelect",
      options : [
        {val : "Battle", label : "Battle"},
        {val : "Trade", label : "Trade"},
        {val : "Intrigue", label : "Intrigue"},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "fromlevel",
      label : "From Level",
      type : "staticSelect",
      options : [
        {val : 1, label : "1"},
        {val : 2, label : "2"},
        {val : 3, label : "3"},
        {val : 4, label : "4"},
        {val : 5, label : "5"},
        {val : 6, label : "6"},
        {val : 7, label : "7"},
        {val : 8, label : "8"},
        {val : 9, label : "9"},
        {val : 10, label : "10"},
        {val : 11, label : "11"},
        {val : 12, label : "12"},
        {val : 13, label : "13"},
        {val : 14, label : "14"},
        {val : 15, label : "15"},
        {val : 16, label : "16"},
        {val : 17, label : "17"},
        {val : 18, label : "18"},
        {val : 19, label : "19"},
        {val : 20, label : "20"},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "tolevel",
      label : "To Level",
      type : "staticSelect",
      options : [
        {val : 1, label : "1"},
        {val : 2, label : "2"},
        {val : 3, label : "3"},
        {val : 4, label : "4"},
        {val : 5, label : "5"},
        {val : 6, label : "6"},
        {val : 7, label : "7"},
        {val : 8, label : "8"},
        {val : 9, label : "9"},
        {val : 10, label : "10"},
        {val : 11, label : "11"},
        {val : 12, label : "12"},
        {val : 13, label : "13"},
        {val : 14, label : "14"},
        {val : 15, label : "15"},
        {val : 16, label : "16"},
        {val : 17, label : "17"},
        {val : 18, label : "18"},
        {val : 19, label : "19"},
        {val : 20, label : "20"},
      ],
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
  ],
  profile : [
    {
      name : "gotaname",
      label : "Game Name",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },
    /*{
      name : "profileImg",
      label : "Profile Image",
      type : "imageUpload",
      btnLabel : "Browse",
      method : "ReadAsDataURI",
      accept : "image/*",
    },*/
    {
      name : "bday_month",
      label : "Birthday Month",
      type : "staticSelect",
      options : [
        {val : 1, label : 'January'},
        {val : 2, label : 'February'},
        {val : 3, label : 'March'},
        {val : 4, label : 'April'},
        {val : 5, label : 'May'},
        {val : 6, label : 'June'},
        {val : 7, label : 'July'},
        {val : 8, label : 'August'},
        {val : 9, label : 'September'},
        {val : 10, label : 'October'},
        {val : 11, label : 'November'},
        {val : 12, label : 'December'},
      ],
      prompt : "Select",
      //sortable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    {
      name : "bday_date",
      label : "Birthday Date",
      type : "staticSelect",
      options : [
        {val : 1, label : '1'},
        {val : 2, label : '2'},
        {val : 3, label : '3'},
        {val : 4, label : '4'},
        {val : 5, label : '5'},
        {val : 6, label : '6'},
        {val : 7, label : '7'},
        {val : 8, label : '8'},
        {val : 9, label : '9'},
        {val : 10, label : '10'},
        {val : 11, label : '11'},
        {val : 12, label : '12'},
        {val : 13, label : '13'},
        {val : 14, label : '14'},
        {val : 15, label : '15'},
        {val : 16, label : '16'},
        {val : 17, label : '17'},
        {val : 18, label : '18'},
        {val : 19, label : '19'},
        {val : 20, label : '20'},
        {val : 21, label : '21'},
        {val : 22, label : '22'},
        {val : 23, label : '23'},
        {val : 24, label : '24'},
        {val : 25, label : '25'},
        {val : 26, label : '26'},
        {val : 27, label : '27'},
        {val : 28, label : '28'},
        {val : 29, label : '29'},
        {val : 30, label : '30'},
        {val : 31, label : '31'},
      ],
      prompt : "Select",
      //sortable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    /*{
      name : "timezone",
      label : "Time Zone",
      type : "textInput",
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
      sortable : true,
      searchable : true,
    },*/
    {
      name : "fealty",
      label : "Fealty",
      type : "staticSelect",
      options : [
        {val : "Stark", label : "Stark"},
        {val : "Lannister", label : "Lannister"},
        {val : "Greyjoy", label : "Greyjoy"},
        {val : "Baratheon", label : "Baratheon"},
        {val : "Targaryen", label : "Targaryen"},
        {val : "Martell", label : "Martell"},
        {val : "Tyrell", label : "Tyrell"},
        {val : "Tully", label : "Tully"},
      ],
      prompt : "Select",
      sortable : true,
      filterable : true,
      validations : [
        {type : 0, invalidMessage : "Cant be empty"},
      ],
    },
    /*{
      name : "talents",
      label : "Talents",
      type : "multiEntry",
      validations : [
      ],
      childCol : {
        name : "talent",
        type : "staticSelect",
        options : [
          {val : "Battle", label : "Battle"},
          {val : "Intrigue", label : "Intrigue"},
          {val : "Trade", label : "Trade"},
          {val : "Fight", label : "Fight"},
          {val : "Harass", label : "Harass"},
          {val : "Aid", label : "Aid"},
          {val : "Spy", label : "Spy"},
          {val : "Sabotage", label : "Sabotage"},
          {val : "Steal", label : "Steal"},
          {val : "Barter", label : "Barter"},
          {val : "Swindle", label : "Swindle"},
          {val : "Bribe", label : "Bribe"},
        ],
        prompt : "Select",
      },
    },*/
    {
      name : "linage",
      label : "Lineage",
      type : "textareaInput",
      validations : [
      ],
    },
    {
      name : "gotafrlink",
      label : "Game Friend Request Link",
      type : "textInput",
      validations : [
      ],
    },
  ],
};