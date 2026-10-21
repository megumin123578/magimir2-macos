import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;

enum ExportFormat {
  jpeg('JPEG', 'jpg'),
  png('PNG', 'png');

  const ExportFormat(this.label, this.extension);

  final String label;
  final String extension;
}

class ExportRequest {
  const ExportRequest({
    required this.sourceBytes,
    required this.sourceName,
    required this.destinationDirectory,
    required this.format,
    required this.jpegQuality,
  });

  final Uint8List sourceBytes;
  final String sourceName;
  final String destinationDirectory;
  final ExportFormat format;
  final int jpegQuality;
}

class ExportException implements Exception {
  const ExportException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ExportService {
  const ExportService();

  Future<String> export(ExportRequest request) async {
    final decoded = img.decodeImage(request.sourceBytes);
    if (decoded == null) {
      throw const ExportException('Không thể đọc dữ liệu ảnh đã chọn.');
    }

    final encoded = switch (request.format) {
      ExportFormat.jpeg => img.encodeJpg(
          decoded,
          quality: request.jpegQuality,
        ),
      ExportFormat.png => img.encodePng(decoded),
    };

    final outputPath = await nextAvailablePath(
      directory: request.destinationDirectory,
      sourceName: request.sourceName,
      extension: request.format.extension,
    );

    await File(outputPath).writeAsBytes(encoded, flush: true);
    return outputPath;
  }

  Future<String> nextAvailablePath({
    required String directory,
    required String sourceName,
    required String extension,
  }) async {
    final separator = Platform.pathSeparator;
    final normalizedDirectory = directory.endsWith(separator)
        ? directory.substring(0, directory.length - 1)
        : directory;
    final baseName = _fileStem(sourceName);
    var candidate =
        '$normalizedDirectory${separator}${baseName}_export.$extension';
    var suffix = 2;

    while (await File(candidate).exists()) {
      candidate =
          '$normalizedDirectory${separator}${baseName}_export_$suffix.$extension';
      suffix += 1;
    }

    return candidate;
  }

  String _fileStem(String fileName) {
    final normalized = fileName.replaceAll('\\', '/');
    final name = normalized.substring(normalized.lastIndexOf('/') + 1);
    final dot = name.lastIndexOf('.');
    final stem = dot > 0 ? name.substring(0, dot) : name;
    final safe = stem.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_').trim();
    return safe.isEmpty ? 'image' : safe;
  }
}
