import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import {
  SketchPicker
} from 'react-color'

const removeUnused = require('postcss-remove-unused')
const postcss = require('postcss')
const prettier = require("prettier/standalone")
const plugins = [require("prettier/parser-html"), require("prettier/parser-postcss")]
const CSS = require('css')
const cssjs = require("jotform-css.js")
//initialize parser object
const parser = new cssjs.cssjs()
const request = axios.create()

// 移除指定标签
function removeTags(tagName, el = document){
  var tagElements = el.getElementsByTagName(tagName);
  for(var m = tagElements.length - 1; m >= 0; m--){
    tagElements[m].parentNode.removeChild( tagElements[m]);
  }
}

// 移除所有CSS
function removeAllCSS (el = document) {
  el.querySelectorAll('link').forEach(linkEl => linkEl.rel === 'stylesheet' && linkEl.remove());
  el.querySelectorAll('style').forEach(styleEl => styleEl.remove());
  (function recurse (node) {
    node.childNodes.forEach(recurse);
    if (node.removeAttribute) {
      node.removeAttribute('height')
      node.removeAttribute('border')
      node.removeAttribute('cellpadding')
      node.removeAttribute('cellspacing')
      node.removeAttribute('class')
    }
    return node.removeAttribute && node.removeAttribute('style');
  })(el.body);
}

// 移除表格所有宽度
function removeTableWidth (el = document) {
  el.querySelectorAll('width').forEach(styleEl => styleEl.remove());
  (function recurse (node) {
    node.childNodes.forEach(recurse);
    return node.removeAttribute && node.removeAttribute('width');
  })(el.body);
}

// 为CSS的AST添加前缀
function scopeCSS(css, prefix) {
  var ast = CSS.parse(css);
  var stylesheet = ast.stylesheet;
  if (stylesheet) {
    var rules = stylesheet.rules;
    // Append our container scope to rules
    // Recursive rule appender
    var ruleAppend = function(rules) {
      rules.forEach(function(rule) {
        if (rule.selectors !== undefined) {
          rule.selectors = rule.selectors.map(function(selector) {
            return prefix + " " + selector;
          });
        }
        if (rule.rules !== undefined) {
          ruleAppend(rule.rules);
        }
      });
    };
    ruleAppend(rules);
  }
  return CSS.stringify(ast);
}

// 移除指定的CSS样式
function removeCSS(ast, names) {
  ast = ast.map(function(rule) {
    if (rule.selector) {
      for (const n in names) {
        if (rule.selector === names[n]) {
          return null
        }
      }
    }
    return rule
  });
  ast = ast.filter(function (s) {
    return s != null
  });
  return ast;
}

// 移除包含指定字符串的CSS样式
function removeCSSIncludes(ast, names) {
  ast = ast.map(function(rule) {
    if (rule.selector) {
      for (const n in names) {
        if (rule.selector.includes(names[n])) {
          return null
        }
      }
    }
    return rule
  });
  ast = ast.filter(function (s) {
    return s != null
  });
  return ast;
}

// 移除包含指定字符串的CSS属性
function removeCSSatt(ast, names) {
  ast = ast.map(function(rule) {
    let rules = rule.rules
    rules = rules.map((r) => {
      if (r.directive) {
        for (const n in names) {
          if (r.directive.includes(names[n])) {
            return null
          }
        }
      }
      if (r.value && r.value.length - 2 > 0 && r.value.lastIndexOf('pt') === r.value.length - 2) { // 判断以 pt 结尾
        r.value = r.value.replaceAll('0cm', '0').replaceAll('pt', 'px')
      }
      return r
    })

    rules = rules.filter(function (s) {
      return s != null
    });

    rule.rules = rules
    return rule
  });
  ast = ast.filter(function (s) {
    return s != null
  });
  return ast;
}

// 生成随机字符串
function makeid() {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";
 
  for( var i=0; i < 8; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
 
  return text;
}

// 表格宽度转百分比
function convertWidthToPercent (el = document) {
  const tables = el.body.getElementsByTagName('table')
  for (const n in tables) {
    const table = tables[n]
    if (table) {
      const tableWidth = table.offsetWidth;
      if (table.removeAttribute) {
        table.removeAttribute('width')
      }

      if (table.style && table.style.width) table.style.width = '100%'

      const tds = el.body.getElementsByTagName('td')
      for (const i in tds) {
        const node = tds[i]
        if (node.removeAttribute) {
          node.removeAttribute('width')
        }
        if (node.offsetWidth && node.offsetWidth > 0) {
          node.style.width = (node.offsetWidth / tableWidth).toFixed(3) * 100 + '%'
        }
      }
    }
  }
}

// 移除Style中Office字体样式和专用样式
function removeStyleatt (el = document) {
  const tables = el.body.getElementsByTagName('table');
  (function recurse (nodes) {
    for (const i in nodes) {
      const node = nodes[i]
      if (node.getAttribute) {
        const style = node.getAttribute('style')
        if (style) {
          const classid = makeid()
          let parsed = parser.parseCSS('.' + classid + '{' + style + '}');
          parsed = removeCSSatt(parsed, ['font-family', 'mso-', 'page-break-inside'])
          let newCSSString = parser.getCSSForEditor(parsed);
          newCSSString = newCSSString.match(/\{[\S\s]+\}/)
          if (newCSSString && newCSSString.length >= 1) {
            newCSSString = newCSSString[0].substring(1, newCSSString[0].length-1).replace(/\s/g,'').replace(/<\/?.+?>/g,"").replace(/[\r\n]/g, "")
            if (newCSSString !== '') {
              node.setAttribute('style', newCSSString)
            }
          } else {
            node.removeAttribute('style')
          }
        }
      }
      if (node.childNodes) recurse(node.childNodes)
    }
  })(tables);
  for (const x in tables) {
    if (tables[x] && tables[x].getAttribute) {
      let style = tables[x].getAttribute('style')
      if (style && style.includes('border:none;')) {
        style = style.replaceAll('border:none;', '')
        if (style !== '') {
          tables[x].setAttribute('style', style)
        } else {
          tables[x].removeAttribute('style')
        }
      }
    }
  }
}

class App extends Component {

  constructor(){
      super();
      this.state = {
        value: '点击这里开始',
        html: '',
        type: 'excel',
        mobile: true,
        uncss: true,
        removeOfficeCss: true,
        compress: false,
        removeAllCSS: false,
        removeTableWidth: false,
        percent: false,
        border: false,
        borderColor: false,
        borderColorValue: '#000'
      };
  }

  textareaClick = (e) => {
    this.textareaInput.focus();
    this.textareaInput.select();
  }

  inputFocus = (e) => {
    this.setState(() => ({value: '现在请使用 CTRL+V 粘贴Excel表格（计算量大，请耐心等待结果）'}));
    this.textInput.style.backgroundColor="#90c5a9";
  }

  inputBlur = (e) => {
    this.setState(() => ({value: '点击这里开始'}));
  }

  inputPaste = (e) => {
    document.getElementById("loading").style.display = 'block'
    // regexp
    var toReg = e.clipboardData.getData('text/html');
    setTimeout(async () => {
      let preid = makeid()
      var preview = document.getElementById("preview")
      var p = (preview.contentDocument || preview.contentWindow);
      p = p.document || p;
      
      // console.log(toReg);
      toReg = toReg.replace(/(\r\n|\n|\r)/gm,"");
      var regstyle = /<STYLE*>.*<\/STYLE>/gi;
      var reg = /<TABLE.*>.*<\/TABLE>/gi;
      
      let styleCode = toReg.match(regstyle)
      let tableCode = toReg.match(reg)
    
      try {
        // 移除问题标签
        // console.log(styleCode)
        if (styleCode !== null) styleCode = styleCode.toString().replaceAll('<!--table', 'table').replaceAll('}--></style>', '}</style>').replaceAll('<!-- /\\* Font Definitions \\*/', '').replaceAll('<!--\\[if gte mso 10\\]>', '');
        // console.log(styleCode)
        if (tableCode !== null) tableCode = tableCode.toString().replaceAll('<!--StartFragment-->', '').replaceAll('<!--EndFragment-->', '').replaceAll('<!--\\[endif\\]-->', '');
        if (styleCode !== null) {
          styleCode = styleCode.replaceAll('<style>', '').replaceAll('</style>', '');

          var CleanCSS = require('clean-css');
          var output = new CleanCSS({
            compatibility: 'ie9,-properties.merging'
          }).minify(styleCode);
          styleCode = output.styles

          // 避免CSS污染全局样式
          // parse css string
          let parsed = parser.parseCSS(styleCode);
          parsed = removeCSS(parsed, ['html', 'body'])
          parsed = removeCSSIncludes(parsed, ['@'])

          // 移除Office字体样式和专用样式
          if (this.state.removeOfficeCss) {
            parsed = removeCSSatt(parsed, ['mso-', 'font-family'])
          }

          let newCSSString = parser.getCSSForEditor(parsed);
          // console.log(newCSSString)
          newCSSString = scopeCSS(newCSSString, '.' + preid)
          // console.log(newCSSString)

          styleCode = newCSSString

          let style = ''
          if (this.state.mobile) {
            style = `style="width: 100%;height: 80%;overflow: auto;"`
          }

          tableCode = `<div class="${preid}" ${style}>` + tableCode + '</div>'

          styleCode = prettier.format(styleCode, { parser: "css", plugins })
        }
      } catch (err) {
        console.log(err)
      }

      var finalCode;
      if(styleCode != null) {

        if (this.state.uncss) {
          const cssResult = await postcss([ // 移除未使用的CSS
            removeUnused({html: tableCode})
          ]).process(styleCode);
    
          styleCode = cssResult.css
        }

        finalCode = '<style>\n' + styleCode + '</style>\n\n' + tableCode;
      } else {
        finalCode = tableCode;
      }
      
      if(finalCode != null){
        // iframe
        p.body.innerHTML = finalCode;

        // 移除多余标签
        removeTags('col', p)
        removeTags('colgroup', p)

        if (this.state.removeAllCSS) removeAllCSS(p)
        if (this.state.removeTableWidth) removeTableWidth(p)

        // 转百分数
        if (this.state.percent) convertWidthToPercent(p)

        // 移除Office字体样式和专用样式
        if (this.state.removeOfficeCss) {
          removeStyleatt(p)
        }

        // 添加边框
        if (this.state.border) {
          const tableObjects = p.getElementsByTagName('table')
          for (let ob = tableObjects.length - 1; ob >= 0; ob--) {
            tableObjects[ob].setAttribute("border", "1")
            tableObjects[ob].style.borderCollapse = "collapse"
          }
        }

        // 添加边框颜色
        if (this.state.borderColor) {
          const tableObjects = p.getElementsByTagName('table')
          for (let ob = tableObjects.length - 1; ob >= 0; ob--) {
            tableObjects[ob].setAttribute("bordercolor", this.state.borderColorValue)
          }
        }

        finalCode = p.body.innerHTML
        finalCode = prettier.format(finalCode, { parser: "html", plugins });

        // 压缩HTML
        if (this.state.compress) {
          const {
            data
          } = await request.post('https://minifier.yige.ink', {
            code: finalCode
          })

          if (data.status === 1) {
            finalCode = data.result
          }
        }

        p.body.innerHTML = finalCode;

        this.setState(() => ({html: finalCode}));
        this.textInput.style.backgroundColor="#7a9a95";
        this.textareaInput.focus();
        this.textareaInput.select();
        this.textareaInput.style.textAlign="left";
        this.setState(() => ({value: '现在使用 CTRL+C 可以复制下面的代码，或者点击这里开始粘贴其它表格。'}));
        this.textInput.style.backgroundColor="#fa8b60";
      } else {
        this.textInput.style.backgroundColor="#7a9a95";
        this.textareaInput.focus();
        this.setState(() => ({html: '看起来你似乎没有粘贴合适的表格内容'}));
        this.textareaInput.style.textAlign="center";
      }
      document.getElementById("loading").style.display = 'none'
    }, 50)
  }

  handleChange = (e) => {
    this.setState({type: e.target.value})
  }

  boxChange = (e) => {
    const state = {}
    state[e.target.value] = !this.state[e.target.value]
    this.setState(state)
  }

  handleBorderColorChangeComplete = (color) => {
    this.setState({
      borderColorValue: color.hex
    });
  }

  render() {
    return (
      <div className="App">
        <div id="loading">
          <div id="loading-center">
            <div id="loading-center-absolute">
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
              <div className="object"></div>
            </div>
            <div className="loading-title"><h2>正在全力计算中</h2></div>
          </div>
        </div>
        <div className="Power">
          <strong>Office Table 转 HTML Table</strong>
          <div className="PowerType">
            <label ><input type="radio" name='type' value="excel" checked={this.state.type === 'excel'}
                  onChange={this.handleChange}/>Excel</label><br/>
            <label ><input type="radio" name='type' value="word" checked={this.state.type === 'word'}
                  onChange={this.handleChange}/>Word/PowerPoint</label><br/>
            <label ><input type="checkbox" name='type' value="mobile" checked={this.state.mobile === true}
                  onChange={this.boxChange}/>添加移动端支持</label><br/>
            <label ><input type="checkbox" name='type' value="uncss" checked={this.state.uncss === true}
                  onChange={this.boxChange}/>移除未使用的CSS</label><br/>
            <label ><input type="checkbox" name='type' value="removeOfficeCss" checked={this.state.removeOfficeCss === true}
                  onChange={this.boxChange}/>移除Office字体样式和专用样式（推荐）</label><br/>
            <label ><input type="checkbox" name='type' value="compress" checked={this.state.compress === true}
                  onChange={this.boxChange}/>压缩代码（耗时较长）</label><br/>
            <label ><input type="checkbox" name='type' value="removeAllCSS" checked={this.state.removeAllCSS === true}
                  onChange={this.boxChange}/>移除所有样式</label><br/>
            <label ><input type="checkbox" name='type' value="removeTableWidth" checked={this.state.removeTableWidth === true}
                  onChange={this.boxChange}/>移除表格宽度</label><br/>
            <label ><input type="checkbox" name='type' value="percent" checked={this.state.percent === true}
                  onChange={this.boxChange}/>将表格宽度转换为百分比</label><br/>
            <label ><input type="checkbox" name='type' value="border" checked={this.state.border === true}
                  onChange={this.boxChange}/>添加表格默认边框</label><br/>
            <label ><input type="checkbox" name='type' value="borderColor" checked={this.state.borderColor === true}
                  onChange={this.boxChange}/>添加表格默认边框颜色</label><br/>
            <div id="colorPicker"><SketchPicker
              color = {
                this.state.borderColorValue
              }
              onChangeComplete = {
                this.handleBorderColorChangeComplete
              }
            /></div>
          </div>
        </div>
        <input type="text" id="input" value={this.state.value} onFocus={this.inputFocus} onBlur={this.inputBlur} onPaste={this.inputPaste} ref={(input) => { this.textInput = input; }} readOnly/>
        <textarea id="output" onClick={this.textareaClick} ref={(input) => { this.textareaInput = input; }} value={this.state.html} readOnly></textarea>
        <iframe id="preview" title="preview"></iframe>
      </div>
    );
  }
}

export default App;
