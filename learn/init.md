# init

- 闭包记录`uid`
```js
let uid = 0
```

## `initMixin`方法
  - params: `Vue`
  - 定义`Vue.prototype._init`方法
    - 合并options，设置_renderProxy，_self
    - 初始化vm
    ```js
       initLifecycle(vm);
        initEvents(vm);
        initRender(vm);
        callHook(vm, "beforeCreate");
        initInjections(vm); // resolve injections before data/props

        initState(vm);
        initProvide(vm); // resolve provide after data/props

        callHook(vm, "created");
    ```

```js
import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state' 
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

export function initMixin (Vue: Class<Component>) { //接收Vue实例
  Vue.prototype._init = function (options?: Object) {
    // vm = this = vue 实例 
    const vm: Component = this
    // a uid 通过闭包自增
    vm._uid = uid++
    // performance性能工具使用的tag
    let startTag, endTag
    /* istanbul ignore if */ // 测试性能
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag) // 👇查看mark代码
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) { //options 合并 👇代码
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 没有options 直接合并
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
```

- `mark`方法
  
```js
import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  //  浏览器性能工具
  const perf = inBrowser && window.performance
  //performance的pai
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag)

    measure = (name, startTag, endTag) => {
      //  测量从标签开始到标签结束名为name的用时毫秒 http://www.alloyteam.com/2015/09/explore-performance/
      perf.measure(name, startTag, endTag) //https://developer.mozilla.org/zh-CN/docs/Web/API/Performance/measure
      perf.clearMarks(startTag) // 销毁标签
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}

```

- `initInternalComponent`

```js
//  合并options ，vm 的$options
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  //  vm $options = {},{} 继承 Vue 的options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration. //下面就是一些引用设置options
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
```


