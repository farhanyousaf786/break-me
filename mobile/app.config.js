const fs = require('fs')
const path = require('path')

const IOS_FILE = './GoogleService-Info.plist'
const ANDROID_FILE = './google-services.json'

/**
 * Google Sign-In reads its native settings from the Firebase config files. They are optional:
 * without them the app still builds and guest play works, and the Google button explains what's missing.
 *
 * On EAS, `GOOGLE_SERVICES_JSON` is a file env var (path to the uploaded google-services.json).
 */
module.exports = ({ config }) => {
  const androidFromEnv = process.env.GOOGLE_SERVICES_JSON
  const androidFile =
    androidFromEnv && fs.existsSync(androidFromEnv)
      ? androidFromEnv
      : fs.existsSync(path.join(__dirname, ANDROID_FILE))
        ? ANDROID_FILE
        : null
  const hasIos = fs.existsSync(path.join(__dirname, IOS_FILE))
  if (!hasIos && !androidFile) return config

  return {
    ...config,
    ios: { ...config.ios, ...(hasIos ? { googleServicesFile: IOS_FILE } : {}) },
    android: { ...config.android, ...(androidFile ? { googleServicesFile: androidFile } : {}) },
    plugins: [...(config.plugins ?? []), '@react-native-google-signin/google-signin'],
  }
}
