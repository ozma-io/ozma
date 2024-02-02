import postcss from 'postcss'

export const sanitizeCSS = (css: string) => {
  const allowedProperties = [
    'background-color',
    'color',
    'font-size',

    'padding',
    'padding-top',
    'padding-bottom',
    'padding-left',
    'padding-right',

    'margin',
    'margin-top',
    'margin-bottom',
    'margin-left',
    'margin-right',

    'height',
    'width',
    'min-height',
    'min-width',
    'max-height',
    'max-width',

    'border',
    'border-radius',
    'border-top',
    'border-bottom',
    'border-left',
    'border-right',
    'border-color',
    'border-style',

    'text-align',
    'text-decoration',
    'text-transform',
  ]

  try {
    const result = postcss([]).process(css, { from: undefined })
    const cssAst = result.root

    if (cssAst.type !== 'root') {
      throw new Error(
        'Unexpected PostCSS AST type. Expected "root", got: ' + cssAst.type,
      )
    }

    cssAst.walkDecls((decl) => {
      if (!allowedProperties.includes(decl.prop)) {
        decl.remove()
        console.warn(
          `Disallowed CSS property in custom_css setting: ${decl.prop}`,
        )
      }
    })

    return cssAst.toString()
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Invalid CSS:', error.message)
    } else {
      console.error('Unknown error:', error)
    }
    return ''
  }
}
