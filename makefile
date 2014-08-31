SCRIPTS_PATH = build/scripts
MINIFY_SCRIPT = $(SCRIPTS_PATH)/minifyFile.pl
REPLACE_SCRIPT_TAGS = $(SCRIPTS_PATH)/replaceScriptTags.pl
GET_FILES = $(SCRIPTS_PATH)/getDeepFiles.pl
GET_FILES_FLAGS = files
GET_DIRS_FLAGS = dirs
GET_ORDER = $(SCRIPTS_PATH)/getOrder.pl

INDEX_PATH = src/ui/index.html
MINIFIED_APP_JS = ember-app.js

NODEJS_PROD_PATH = prod/nodejs
NODEJS_PROD_UI_PATH = $(NODEJS_PROD_PATH)/public
NODEJS_PROD_UI_JS_PATH = $(NODEJS_PROD_UI_PATH)/js
NODEJS_PROD_UI_CSS_PATH = $(NODEJS_PROD_UI_PATH)/css
NODEJS_PROD_UI_FONTS_PATH = $(NODEJS_PROD_UI_PATH)/fonts
NODEJS_SRC_FILES = $(filter-out public, $(wildcard src/nodejs/*))

JS_SRC_PATH = src/ui/js/
JS_SRC_PACKAGES = utils ember
JS_SRC_FILES = $(foreach package, $(JS_SRC_PACKAGES), $(shell perl $(GET_ORDER) $(INDEX_PATH) '"js/($(package)/.*?)"'))
JS_SRC_FILES_NAMES = $(notdir $(JS_SRC_FILES))
JS_SRC_FILES_FULLPATH = $(addprefix $(JS_SRC_PATH), $(JS_SRC_FILES))
JS_SRC_LIB_PATH = $(addprefix $(JS_SRC_PATH), lib)
JS_SRC_LIB_FILES = $(wildcard $(JS_SRC_LIB_PATH)/*)
JS_OP_FILES = $(JS_SRC_FILES_NAMES:%.js=%.min.js)

FONT_SRC_PATH = src/ui/fonts
FONT_FILES = $(wildcard $(FONT_SRC_PATH)/*)

CSS_SRC_PATH = src/ui/css
CSS_SRC_FILES = $(wildcard $(CSS_SRC_PATH)/*)
CSS_OP_FILES = $(notdir $(CSS_SRC_FILES:%.css=%.min.css))

MINIFY_COMMAND = java
MINIFY_COMMAND_FLAGS = -jar build/yuicompressor-2.4.8.jar
MINIFY_HTML_COMMAND_FLAGS = --type css

%.min.js :
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $(filter %$(@:%.min.js=%.js), $(JS_SRC_FILES_FULLPATH)) > $@

%.min.css : $(CSS_SRC_PATH)/%.css
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $^ > $@

#ls -tr to maintain the order
$(MINIFIED_APP_JS) : $(JS_OP_FILES)
	perl $(MINIFY_SCRIPT) $^ > $@

index.html : $(INDEX_PATH)
	perl $(REPLACE_SCRIPT_TAGS) $(INDEX_PATH) $(MINIFIED_APP_JS) $(JS_SRC_FILES) | $(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $(MINIFY_HTML_COMMAND_FLAGS) > $@

test :
	ls $(JS_SRC_FILES)

$(NODEJS_PROD_PATH) :
	mkdir -p $(NODEJS_PROD_PATH)

$(NODEJS_PROD_UI_PATH) :
	mkdir -p $(NODEJS_PROD_UI_PATH)

$(NODEJS_PROD_UI_JS_PATH) :
	mkdir -p $(NODEJS_PROD_UI_JS_PATH)

$(NODEJS_PROD_UI_CSS_PATH) :
	mkdir -p $(NODEJS_PROD_UI_CSS_PATH)

$(NODEJS_PROD_UI_FONTS_PATH) :
	mkdir -p $(NODEJS_PROD_UI_FONTS_PATH)

build : build-nodejs build-static
.PHONY : build

build-nodejs : $(NODEJS_SRC_FILES) | $(NODEJS_PROD_PATH)
	cp -r $^ $(NODEJS_PROD_PATH)
	rm -rf $(NODEJS_PROD_PATH)/public/*
.PHONY : build-nodejs

build-static : build-static-parallel build-static-index
.PHONY : build-static

build-static-parallel :
	make -j build-static-minify-copy
.PHONY : build-static

build-static-minify-copy : build-static-js build-static-lib build-static-css build-static-fonts
.PHONY : build-static

build-static-js : $(MINIFIED_APP_JS) | $(NODEJS_PROD_UI_JS_PATH)
	cp $^ $(NODEJS_PROD_UI_JS_PATH)/
.PHONY : build-static-js

build-static-lib : $(JS_SRC_LIB_FILES) | $(NODEJS_PROD_UI_JS_PATH)
	cp $^ $(NODEJS_PROD_UI_JS_PATH)/
.PHONY : build-static-lib

build-static-css : $(CSS_OP_FILES) | $(NODEJS_PROD_UI_CSS_PATH)
	cp $^ $(NODEJS_PROD_UI_CSS_PATH)/
.PHONY : build-static-css

build-static-fonts : $(FONT_FILES) | $(NODEJS_PROD_UI_FONTS_PATH)
	cp $^ $(NODEJS_PROD_UI_FONTS_PATH)/
.PHONY : build-static-fonts

build-static-index : index.html | $(NODEJS_PROD_UI_PATH)
	cp $^ $(NODEJS_PROD_UI_PATH)/
.PHONY : build-static-index

deploy : build
	$(DEPLOY_CMD) $(DEPLOY_CMD_FLAGS) $(NODEJS_PROD_PATH)
.PHONY : deploy

git-push :
	git add -A
	git commit
	git push
	git push openshift
.PHONY : git-push

checkin : build clean git-push
.PHONY : checkin

clean : 
	rm *.js *.css index.html
.PHONY : clean
