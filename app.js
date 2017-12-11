;(function () {
  function debug () {
    if (location.hostname === 'localhost') {
      console.info(...arguments)
      console.trace()
    }
  }

  function debounce (func, wait = 100) {
    let timeout
    return function (...args) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(this, args)
      }, wait)
    }
  }

  Vue.filter('sqf', value => {
    return value.slice(0, value.lastIndexOf('.sqf'))
  })

  Vue.component(
    'app-search',
    Vue.extend({
      props: { list: Array },
      data: function () {
        return {
          lastTerm: null,
          term: null,
          filteredList: []
        }
      },
      created: function () {
        const options = {
          shouldSort: true,
          includeMatches: true,
          threshold: 0.3,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 2,
          keys: ['file']
        }
        const fuse = new window.Fuse(this.list, options)
        this.search = debounce(function (term) {
          const arr = fuse.search(term).slice(0, 20)
          this.filteredList = this.highlight(term, arr)
        }, 250)
      },
      methods: {
        select: function (item, evt) {
          debug('selected:', item.component, item.file)
          this.term = this.getTerm(item)
          this.close()
          this.$router.push({name: 'addons', params: {component: item.component, fnc: item.file}})
        },
        lookUpTerm: function () {
          if ((this.term || '').length < 2) {
            this.lastTerm = null
            this.close()
            return
          }

          if (this.term === this.lastTerm) return

          debug('search', this.term)
          this.lastTerm = this.term
          this.search(this.term)
        },
        highlightPluckReplace: function (arr, start = -1, end = -1) {
          const s = `<span class="search__autocomplete-item--highlight">${arr.slice(start, end + 1).join('')}</span>`
          const ret = arr.slice(0, start).concat([s], arr.slice(end + 1))
          return ret
        },
        highlight: function (term, results) {
          return results.map(result => {
            const data = {
              component: result.item.component,
              file: result.item.file
            }

            let strArr = data.file.split('')
            // TOOD: why is matches an array?
            if (Array.isArray(result.matches)) {
              result.matches.forEach(match => {
                let item
                const indices = [].concat(match.indices)
                while ((item = indices.pop())) {
                  const [start, end] = item
                  strArr = this.highlightPluckReplace(strArr, start, end)
                }
              })
            }

            const str = this.getTerm({ component: data.component,file: strArr.join('') })
            return Object.assign({}, data, { html: str })
          })
        },
        close: function () {
          this.filteredList = []
        },
        getTerm (item) {
          return Vue.options.filters.sqf(item.component + ' - ' + item.file)
        },
        hasItems () {
          return (
            this.term &&
            this.filteredList != null &&
            this.filteredList.length > 0
          )
        },
        handleArrowKey: function (goDown, $evt) {
          const list = this.$refs.listContainer
          if (!list) return

          $evt.preventDefault()
          const target = $evt.target
          if (this.$refs.search === target) {
            return this.focus(goDown ? list.firstChild : list.lastChild)
          }

          let next = goDown ? target.nextSibling : target.previousSibling
          if (!next) next = this.$refs.search
          this.focus(next)
        },
        focus: function (el) {
          if (el && el.focus) return el.focus()
          debug('Failed to focus', el)
        }
      },
      template: `         
        <div class="search__autocomplete">
            <input ref="search" class="search__autocomplete-input"
              type="text"
              placeholder="Search..."
              v-model="term"
              @keydown.up="handleArrowKey(false, $event)"
              @keydown.down="handleArrowKey(true, $event)"
              @keyup="lookUpTerm()" />
            <div ref="listContainer" class="search__autocomplete-list" v-if="hasItems()" @keydown.up="handleArrowKey(false, $event)" @keydown.down="handleArrowKey(true, $event)">
                <button class="search__autocomplete-item"
                    v-on:click="select(item)"
                    v-for="item in filteredList"
                    v-html="item.html">
                </button>
            </div>
        </div>
      `
    })
  )

  const data = fetch('/out.json').then(data => data.json()).then(data => {
    const searchTerms = data.reduce((acc, cur) => {
      acc.push(
        ...cur.files.map(v => {
          return { component: cur.component, file: v.fileName }
        })
      )
      acc.push(
        ...cur.functions.map(v => {
          return { component: cur.component, file: v.fileName }
        })
      )
      return acc
    }, [])

    const Home = {
      template: '<div<Home!</div>'
    }

    const View = {
      template: '<div>Hi! {{$route.param}}</div>'
    }

    const router = new VueRouter({
      mode: 'hash',
      routes: [
        {name: 'home', path: '/', component: Home},
        {name: 'addons', path :'/addons/:component/:fnc', component: View},
        {path: '*', redirect: '/'}
      ]
    })

    const app = new Vue({
      router,
      data: {
        terms: searchTerms
      },
      template: `
        <section>
          <nav>
              <section class="search__container">
                  <app-search :list="terms"></app-search>
              </section>    
          </nav>

          <article>
            <router-view></router-view>
          </article>
        </section>
      `
    }).$mount('#app')
  })
})()
