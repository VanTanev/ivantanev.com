import Typography from "typography"
import Wordpress2016 from "typography-theme-wordpress-2016"

Wordpress2016.overrideThemeStyles = () => {
  return {
    "a.gatsby-resp-image-link": {
      boxShadow: `none`,
    },
    h3: {
      marginTop: "1.75rem",
    },
    h4: {
      textTransform: "initial",
    },
    "p code": {
      fontSize: "0.75rem",
    },
    // TODO: why tho
    "h1 code, h2 code, h3 code, h4 code, h5 code, h6 code": {
      fontSize: "inherit",
    },
    "li code": {
      fontSize: "0.75rem",
    },
  }
}

Wordpress2016.baseFontSize = "16px"

delete Wordpress2016.googleFonts

const typography = new Typography(Wordpress2016)

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
