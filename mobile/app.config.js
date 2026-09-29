const fs = require('fs')
const path = require('path')

const IOS_FILE = './GoogleService-Info.plist'
const ANDROID_FILE = './google-services.json'

/**
 * Google Sign-In reads its native settings from the Firebase config files. They are optional:
 * without them the app still builds and guest play works, and the Google button explains what's missing.
 */
module.exports = ({ config }) => {
  const hasIos = fs.existsSync(path.join(__dirname, IOS_FILE))
  const hasAndroid = fs.existsSync(path.join(__dirname, ANDROID_FILE))
  if (!hasIos && !hasAndroid) return config

  return {
    ...config,
    ios: { ...config.ios, ...(hasIos ? { googleServicesFile: IOS_FILE } : {}) },
    android: { ...config.android, ...(hasAndroid ? { googleServicesFile: ANDROID_FILE } : {}) },
    plugins: [...(config.plugins ?? []), '@react-native-google-signin/google-signin'],
  }
}
