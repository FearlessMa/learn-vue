

# vue 

- src/core/instance/index.js 
  - 判断 this是不是vue实例 与 初始化options
    -  this instanceof Vue 判断
    - this._init(options)  
  - initMixin(Vue) init.js
    - [初始化vue](./init.md) 
  - stateMixin(Vue)
  - eventsMixin(Vue)
  - lifecycleMixin(Vue)
  - renderMixin(Vue)