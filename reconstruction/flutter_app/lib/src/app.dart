import 'package:flutter/material.dart';

import 'features/workspace/workspace_page.dart';

class ReconstructedApp extends StatelessWidget {
  const ReconstructedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'MagiMir Reconstruction',
      theme: ThemeData(
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xff7b61ff),
        useMaterial3: true,
      ),
      home: const WorkspacePage(),
    );
  }
}
