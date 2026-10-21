import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import 'export_service.dart';

enum WorkspaceTool {
  preset('Preset'),
  portrait('Portrait'),
  color('Color'),
  liquify('Liquify'),
  background('Background'),
  dress('Clothing'),
  crop('Crop'),
  idPhoto('ID photo'),
  aiTools('AI tools'),
  mimic('Mimic'),
  camera('Camera');

  const WorkspaceTool(this.label);
  final String label;
}

class WorkspacePage extends StatefulWidget {
  const WorkspacePage({super.key});

  @override
  State<WorkspacePage> createState() => _WorkspacePageState();
}

class _WorkspacePageState extends State<WorkspacePage> {
  final ExportService _exportService = const ExportService();

  WorkspaceTool selectedTool = WorkspaceTool.preset;
  Uint8List? _imageBytes;
  String? _imageName;
  bool _isExporting = false;

  Future<void> _importImage() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png'],
      withData: true,
    );
    if (!mounted || result == null) return;

    final file = result.files.single;
    final bytes = file.bytes;
    if (bytes == null) {
      _showMessage('Không thể đọc ảnh đã chọn.');
      return;
    }

    setState(() {
      _imageBytes = bytes;
      _imageName = file.name;
    });
  }

  Future<void> _exportImage() async {
    final bytes = _imageBytes;
    final name = _imageName;
    if (bytes == null || name == null || _isExporting) return;

    final options = await showDialog<_ExportOptions>(
      context: context,
      builder: (context) => const _ExportDialog(),
    );
    if (!mounted || options == null) return;

    final directory = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'Chọn thư mục lưu ảnh',
    );
    if (!mounted || directory == null) return;

    setState(() => _isExporting = true);
    try {
      final outputPath = await _exportService.export(
        ExportRequest(
          sourceBytes: bytes,
          sourceName: name,
          destinationDirectory: directory,
          format: options.format,
          jpegQuality: options.jpegQuality,
        ),
      );
      if (mounted) _showMessage('Đã xuất ảnh: $outputPath');
    } on ExportException catch (error) {
      if (mounted) _showMessage(error.message);
    } catch (error) {
      if (mounted) _showMessage('Xuất ảnh thất bại: $error');
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: true,
            selectedIndex: WorkspaceTool.values.indexOf(selectedTool),
            onDestinationSelected: (index) {
              setState(() => selectedTool = WorkspaceTool.values[index]);
            },
            leading: const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'MagiMir',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ),
            destinations: [
              for (final tool in WorkspaceTool.values)
                NavigationRailDestination(
                  icon: const Icon(Icons.tune),
                  selectedIcon: const Icon(Icons.auto_awesome),
                  label: Text(tool.label),
                ),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                _TopBar(
                  selectedTool: selectedTool,
                  canExport: _imageBytes != null,
                  isExporting: _isExporting,
                  onExport: _exportImage,
                ),
                const Divider(height: 1),
                Expanded(
                  child: Center(
                    child: _imageBytes == null
                        ? _EmptyCanvas(
                            selectedTool: selectedTool,
                            onImport: _importImage,
                          )
                        : _ImageCanvas(
                            bytes: _imageBytes!,
                            name: _imageName!,
                            onReplace: _importImage,
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.selectedTool,
    required this.canExport,
    required this.isExporting,
    required this.onExport,
  });

  final WorkspaceTool selectedTool;
  final bool canExport;
  final bool isExporting;
  final VoidCallback onExport;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          children: [
            Text(
              selectedTool.label,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Spacer(),
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Connect camera'),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              onPressed: canExport && !isExporting ? onExport : null,
              icon: isExporting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.ios_share),
              label: Text(isExporting ? 'Exporting…' : 'Export'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCanvas extends StatelessWidget {
  const _EmptyCanvas({required this.selectedTool, required this.onImport});

  final WorkspaceTool selectedTool;
  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 520),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.add_photo_alternate_outlined, size: 72),
              const SizedBox(height: 20),
              Text(
                '${selectedTool.label} module',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              const Text(
                'Chọn ảnh JPEG hoặc PNG để xem trước và xuất ra máy. '
                'Các công cụ chỉnh sửa vẫn đang được tái dựng.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onImport,
                icon: const Icon(Icons.add),
                label: const Text('Import photos'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageCanvas extends StatelessWidget {
  const _ImageCanvas({
    required this.bytes,
    required this.name,
    required this.onReplace,
  });

  final Uint8List bytes;
  final String name;
  final VoidCallback onReplace;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(bytes, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(child: Text(name, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 12),
              TextButton.icon(
                onPressed: onReplace,
                icon: const Icon(Icons.swap_horiz),
                label: const Text('Đổi ảnh'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExportOptions {
  const _ExportOptions({required this.format, required this.jpegQuality});

  final ExportFormat format;
  final int jpegQuality;
}

class _ExportDialog extends StatefulWidget {
  const _ExportDialog();

  @override
  State<_ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends State<_ExportDialog> {
  ExportFormat _format = ExportFormat.jpeg;
  double _quality = 92;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Xuất ảnh'),
      content: SizedBox(
        width: 360,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Định dạng'),
            const SizedBox(height: 8),
            SegmentedButton<ExportFormat>(
              segments: [
                for (final format in ExportFormat.values)
                  ButtonSegment(value: format, label: Text(format.label)),
              ],
              selected: {_format},
              onSelectionChanged: (selection) {
                setState(() => _format = selection.first);
              },
            ),
            if (_format == ExportFormat.jpeg) ...[
              const SizedBox(height: 24),
              Text('Chất lượng JPEG: ${_quality.round()}%'),
              Slider(
                value: _quality,
                min: 50,
                max: 100,
                divisions: 10,
                label: '${_quality.round()}%',
                onChanged: (value) => setState(() => _quality = value),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(
            context,
            _ExportOptions(
              format: _format,
              jpegQuality: _quality.round(),
            ),
          ),
          child: const Text('Chọn thư mục'),
        ),
      ],
    );
  }
}
