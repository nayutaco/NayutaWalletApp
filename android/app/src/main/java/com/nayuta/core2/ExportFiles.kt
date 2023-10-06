package com.nayuta.core2

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Base64OutputStream
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.common.file.FileUtils
import com.facebook.react.bridge.*
import java.io.*
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class ExportFiles(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    // https://reactnative.dev/docs/native-modules-android#getting-activity-result-from-startactivityforresult
    private val ACTIVITY_RESULT_READTEXTFILE = 1
    private val ACTIVITY_RESULT_READBINFILE = 2
    private var mReadFilePromise: Promise? = null
    private val mActivityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                intent: Intent?
            ) {
                Log.d(TAG, "onActivityResult: get result!!")
                when (requestCode) {
                    ACTIVITY_RESULT_READTEXTFILE -> readFileHandler(requestCode, resultCode, intent)
                    ACTIVITY_RESULT_READBINFILE -> readFileHandler(requestCode, resultCode, intent)
                    else -> Log.e(TAG, "onActivityResult: unknown requestCode=$requestCode")
                }
            }
        }

    init {
        // Add the listener for `onActivityResult`
        reactContext.addActivityEventListener(mActivityEventListener)
    }

    override fun getName(): String {
        return "ExportFiles"
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    private fun getExportDir(): File {
        return File(reactContext.filesDir.toString() + "/export")
    }

    private fun initExportDir() {
        val exportDir = getExportDir()
        if (!exportDir.exists()) {
            val result: Boolean = exportDir.mkdir()
            if (!result) {
                throw FileUtils.CreateDirectoryException("initExportDir: fail mkdir")
            }
        } else {
            val files = exportDir.listFiles()
            if (files != null) {
                for (file in files) {
                    file.delete()
                }
            }
        }
    }

    // createExportFile() save a text file to '<app>/files/export/$filename'.
    private fun createExportFile(filename: String, text: String): Uri {
        val exportDir = getExportDir()
        val fileLocation = File(exportDir, filename)
        val outputStreamWriter = OutputStreamWriter(FileOutputStream(fileLocation))
        outputStreamWriter.write(text)
        outputStreamWriter.close()
        return FileProvider.getUriForFile(
            reactContext,
            BuildConfig.APPLICATION_ID + ".file.provider",
            fileLocation
        )
    }

    // exportTextFile() save a text file and show chooser intent dialog to export the file.
    @ReactMethod
    fun exportTextFile(filename: String, text: String) {
        initExportDir()
        val path = createExportFile(filename, text)
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_STREAM, path)
            type = "application/octet-stream"
        }
        val chooserIntent = Intent.createChooser(sendIntent, null).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        // https://developer.android.com/reference/androidx/core/content/FileProvider#grant-permission-to-a-specific-package
        // https://stackoverflow.com/questions/18249007/how-to-use-support-fileprovider-for-sharing-content-to-other-apps
        val resInfoList: List<ResolveInfo> = reactContext.packageManager
            .queryIntentActivities(chooserIntent, PackageManager.MATCH_DEFAULT_ONLY)
        for (resolveInfo in resInfoList) {
            val packageName = resolveInfo.activityInfo.packageName
            reactContext.grantUriPermission(packageName, path, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        reactContext.startActivity(chooserIntent)
    }

    // readTextFile() show chooser intent dialog and read a selected text file.
    @ReactMethod
    fun readTextFile(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("fail", "activity not exist")
            return
        }
        mReadFilePromise = promise

        // https://developer.android.com/guide/components/intents-common?hl=ja#GetFile
        val intent = Intent()
        intent.action = Intent.ACTION_GET_CONTENT
        intent.type = "*/*"
        if (intent.resolveActivity(activity.packageManager) != null) {
            activity.startActivityForResult(intent, ACTIVITY_RESULT_READTEXTFILE)
        } else {
            mReadFilePromise!!.reject("fail start activity", "resolveActivity")
            mReadFilePromise = null
        }
    }

    // readFileHandler() call after read file intent has done.
    private fun readFileHandler(requestCode: Int, resultCode: Int, intent: Intent?) {
        if (mReadFilePromise == null) {
            Log.e(TAG, "readTextFileHandler: mReadFilePromise is null")
            return
        }
        val promise: Promise = mReadFilePromise as Promise
        if (intent == null) {
            promise.reject("readTextFileHandler result", "maybe canceled")
            return
        }
        if (resultCode == Activity.RESULT_OK) {
            val uri: Uri? = intent.data
            try {
                val result = Arguments.createMap()
                when (requestCode) {
                    ACTIVITY_RESULT_READTEXTFILE -> readResultText(uri, result)
                    ACTIVITY_RESULT_READBINFILE -> readResultBin(uri, result)
                    else  -> Log.e(TAG, "readFileHandler: unknown requestCode=$requestCode")
                }
                val filename = getFilenameFromIntent(intent)
                result.putString("filename", filename)
                promise.resolve(result)
            } catch (e: IOException) {
                promise.reject("readTextFileHandler URI", e)
            } catch (e: Exception) {
                promise.reject("readTextFileHandler file", e)
            }
        } else {
            Log.w(TAG, "readTextFileHandler: resultCode=$resultCode")
            promise.reject(
                "readTextFileHandler result",
                resultCode.toString()
            )
        }
        mReadFilePromise = null
    }

    // readResultText() returns the string of the first line. 
    private fun readResultText(uri: Uri?, result: WritableMap) {
        val text = readFirstLineFromUri(reactContext, uri)
        result.putString("text", text)
    }

    @Throws(IOException::class)
    private fun readFirstLineFromUri(context: Context, uri: Uri?): String {
        val stream: InputStream? = uri?.let { context.contentResolver.openInputStream(it) }
        val inputStreamReader = InputStreamReader(stream)
        val reader = BufferedReader(inputStreamReader)
        val rdata = reader.readLine() // first line only
        inputStreamReader.close()
        return rdata
    }

    private fun readResultBin(uri: Uri?, result: WritableMap) {
        val text = readFirstLineFromUri(reactContext, uri)
        result.putString("text", text)
    }

    private fun getFilenameFromIntent(intent: Intent): String {
        // https://developer.android.com/training/secure-file-sharing/retrieve-info?hl=ja#RetrieveFileInfo
        intent.data?.let { returnUri ->
            reactContext.contentResolver.query(returnUri, null, null, null, null)
        }?.use { cursor ->
            val nameIndex =
                cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            cursor.moveToFirst()
            return cursor.getString(nameIndex)
        }
        return ""
    }

    // fileCopy() create copied file or convert base64 text file. 
    private fun fileCopy(srcFile: File, dstFile: File, @Suppress("SameParameterValue") isBase64: Boolean) {
        try {
            dstFile.createNewFile()
        } catch (e: Exception) {
            Log.e(TAG, "fileCopy: fail create new file")
        }
        val inSrc = FileInputStream(srcFile)
        val outDst = FileOutputStream(dstFile)
        streamCopy(inSrc, outDst, isBase64)
    }

    private fun byteCopy(srcByte: ByteArray, dstFile: File) {
        Log.d(TAG, "byteCopy in count=${srcByte.size}")
        try {
            dstFile.createNewFile()
        } catch (e: Exception) {
            Log.e(TAG, "byteCopy: fail create new file")
        }
        val inSrc = ByteArrayInputStream(srcByte)
        val outDst = FileOutputStream(dstFile)
        streamCopy(inSrc, outDst, false)
    }

    private fun streamCopy(inSrc: InputStream, outDst: OutputStream, isBase64: Boolean) {
        val out = if (isBase64) {
            Base64OutputStream(outDst, Base64.NO_WRAP)
        } else {
            outDst
        }
        inSrc.copyTo(out)
        inSrc.close()
        outDst.close()
    }

    // copySubmarineDbToBase64() convert app.db to base64 file and copy to export directory.
    private fun copySubmarineDbToBase64(): File {
        val dbFile = reactContext.getDatabasePath(AppDbFilename)
        val exportDir = getExportDir()
        val dstFile = File(exportDir, ExportAppDbBackup)
        fileCopy(dbFile, dstFile, true)
        return dstFile
    }

    // exportBackups() export LND channel backup file and app.db backup file.
    @ReactMethod
    fun exportBackups(chanBackup: String, promise: Promise) {
        Log.d(TAG, "exportBackups")
        val activity = currentActivity
        if (activity == null) {
            promise.reject("fail", "activity not exist")
            return
        }
        try {
            initExportDir()
            val path = createExportFile(ExportChannelBackup, chanBackup)
            val copyFile = copySubmarineDbToBase64()
            val fileUris = ArrayList<Uri>()
            fileUris.add(FileProvider.getUriForFile(reactContext, BuildConfig.APPLICATION_ID + ".file.provider", copyFile))
            fileUris.add(path)
            val sendIntent = Intent().apply {
                action = Intent.ACTION_SEND_MULTIPLE
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, fileUris)
                type = "application/octet-stream"
            }
            val chooserIntent = Intent.createChooser(sendIntent, null)
            activity.startActivity(chooserIntent)
        } catch (e: Exception) {
            Log.d(TAG, "exportBackups: $e")
        }
    }

    // readSubmarineBackup() return base64 encoded text of app.db.
    @ReactMethod
    fun readSubmarineBackup(promise: Promise) {
        initExportDir()
        val copyFile = copySubmarineDbToBase64()
        val uri = FileProvider.getUriForFile(reactContext, BuildConfig.APPLICATION_ID + ".file.provider", copyFile)
        val b64 = readFirstLineFromUri(reactContext, uri)
        promise.resolve(b64)
    }

    // createSubmarineDbFile() create app.db from base64 encoded text.
    @ReactMethod
    fun createSubmarineDbFile(dbBase64: String, promise: Promise) {
        val arr: ByteArray = Base64.decode(dbBase64, Base64.DEFAULT)
        val dbFile = reactContext.getDatabasePath(AppDbFilename)
        byteCopy(arr, dbFile)
        promise.resolve(null)
    }

    companion object {
        const val AppDbFilename = "app.db" // appdb\index.ts
        const val ExportChannelBackup = "channel.backup"
        const val ExportAppDbBackup = "application.backup"
        private val TAG = ExportFiles::class.java.name
    }
}
