import 'dart:async';
import 'package:animated_splash_screen/animated_splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:lottie/lottie.dart';
import 'package:project_masyrakat/auth/login.dart';

class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() =>  _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(Duration(seconds: 5), () {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => Login()), 
      );
    });
  }

  @override
  Widget build(BuildContext context){
    return AnimatedSplashScreen(splash:
    Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: LottieBuilder.asset("assets/splash_ui.json"),
        ),
        Text(
          "Selamat Datang",
          style: TextStyle(
          color: Colors.black,
          fontSize: 30,
          fontWeight: FontWeight.bold,
          fontFamily: 'poppins',
          ),
        ),
      ],
    ), 
    nextScreen: Login(),
    splashIconSize: 300,
    backgroundColor: Colors.white,
    );
  }
}