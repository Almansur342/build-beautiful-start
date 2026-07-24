'use strict'
/* globals Utils */

document.addEventListener('DOMContentLoaded', async () => {
  const theme = await Utils.getOption('theme', 'light')

  document.body.classList.toggle('dark', theme === 'dark')
})
