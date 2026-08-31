package com.oznur.generated;

import android.app.*;
import android.os.*;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.io.*;

public class MainActivity extends Activity {
  WebView web; ImageView splash;
  @Override public void onCreate(Bundle b){super.onCreate(b); getWindow().setStatusBarColor(Color.BLACK); getWindow().setNavigationBarColor(Color.BLACK);
    FrameLayout root=new FrameLayout(this);
    web=new WebView(this); web.setVisibility(View.INVISIBLE);
    WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setAllowFileAccess(true); s.setAllowContentAccess(true); s.setMediaPlaybackRequiresUserGesture(false); s.setBuiltInZoomControls(false);
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView v,String url){ web.setVisibility(View.VISIBLE); if(splash!=null){root.removeView(splash);splash=null;} }});
    root.addView(web,new FrameLayout.LayoutParams(-1,-1));
    splash=new ImageView(this); splash.setScaleType(ImageView.ScaleType.CENTER_CROP); splash.setBackgroundColor(Color.BLACK);
    try{InputStream in=getAssets().open("splash.png"); splash.setImageBitmap(BitmapFactory.decodeStream(in)); in.close();}catch(Exception e){}
    root.addView(splash,new FrameLayout.LayoutParams(-1,-1)); setContentView(root);
    String target="file:///android_asset/www/index.html"; try{BufferedReader r=new BufferedReader(new InputStreamReader(getAssets().open("config.txt"))); String line=r.readLine(); r.close(); if(line!=null&&line.startsWith("URL=")) target=line.substring(4);}catch(Exception e){} web.loadUrl(target);
  }
  @Override public void onBackPressed(){ if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed(); }
}
