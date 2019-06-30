import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import * as serviceWorker from './serviceWorker'

ReactDOM.render( < App / > , document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()

// eslint-disable-next-line
String.prototype.replaceAll = function (s1, s2) {
  // for (var j = 0; j < face.length; j++) { //考虑到含有特殊字符，不用正则
  //   while (data.indexOf(face[j][1]) + 1) {
  //     var index = data.indexOf(face[j][1]),
  //       len = face[j][1].length,
  //       str1 = data.substr(0, index),
  //       str2 = data.substr(index + len);
  //     data = str1 + '<img src="' + src + j + '.gif">' + str2;
  //   }
  // }
  return this.replace(new RegExp(s1, "gm"), s2);
}