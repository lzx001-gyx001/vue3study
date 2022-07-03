const bucket = new WeakMap() // 弱引用，失去

const data = {
    foo: true,
    bar: true
}
// 代理data对象
const obj = new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
        // 如果activeEffect不存在，直接return
        track(target, key)
        // 返回属性值
        return target[key]
    },
    set(target, key, newVal) {

        target[key] = newVal

        trigger(target, key)
    }
})
// 在访问obj中任何属性的值得时候，将所有对应的副作用函数添加到桶中
function track(target, key) {
    if (!activeEffect) return target[key]

    // 1.根据target 从桶中取得depsMap，他也是一个Map 类型：key--> effects

    let depsMap = bucket.get(target)
    if (!depsMap) {
        // target原始对象，对应一个映射： depsMap
        bucket.set(target, (depsMap = new Map()))
    }
    // 2.根据key obj的text从depsMap映射中取出所有的effectFn
    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    // 3.最后将当前激活的副作用函数添加到“桶”里
    deps.add(activeEffect)
    // 4.将副作用函数添加到对应的activeEffect的dep中
    activeEffect.deps.push(deps)
}
// 在设置obj中任何属性的值的时候。将所有有关的副作用函数拿出来，执行
function trigger(target, key) {
    // 根据target 从桶 中取出 depsMap 映射
    const depsMap = bucket.get(target)

    if (!depsMap) return
    // 根据key 取得所有的effects

    const effects = depsMap.get(key)
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun && effectsToRun.forEach(effectFn => effectFn())
    // effects && effects.forEach(fn => fn())
}
// 在执行完毕副作用函数的时候，断开副作用函数与obj属性的联系、下次访问属性，又会添加关系
function cleanUp(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}



// 定义一个全局变量储存被注册的副作用函数
let activeEffect;
let effectStack = [];
// 用于注册副作用函数
function effect(fn) {
    const effectFn = () => {
        cleanUp(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }
    effectFn.deps = []
    effectFn()
}
// 执行副作用函数，触发读取obj.text的值，将effect添加到桶中

let temp1, temp2

effect(() => {
    console.log("effect1执行")
    effect(() => {
        console.log("effect2执行")
        temp2 = obj.bar
    })
    temp1 = obj.foo
})

window.obj = obj
window.data = data
window.effect = effect
window.bucket = bucket
window.effectStack = effectStack