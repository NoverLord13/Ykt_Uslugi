import tempfile
import unittest
from io import BytesIO
from pathlib import Path

from PIL import Image

from services.files import _write_image_files, thumbnail_url


class ImageProcessingTests(unittest.TestCase):
    def test_creates_optimized_image_and_thumbnail(self) -> None:
        source = BytesIO()
        Image.new("RGB", (2000, 1200), "red").save(source, "JPEG")

        with tempfile.TemporaryDirectory() as directory:
            upload_path = Path(directory)
            _write_image_files(source.getvalue(), upload_path, "image.jpg", ".jpg")

            original = upload_path / "image.jpg"
            thumbnail = upload_path / "image.thumb.webp"
            self.assertTrue(original.exists())
            self.assertTrue(thumbnail.exists())
            with Image.open(original) as image:
                self.assertLessEqual(max(image.size), 1920)
            with Image.open(thumbnail) as image:
                self.assertLessEqual(image.width, 640)
                self.assertLessEqual(image.height, 480)

    def test_thumbnail_url_is_derived_from_upload_url(self) -> None:
        self.assertEqual(thumbnail_url("/uploads/example.png"), "/uploads/example.thumb.webp")


if __name__ == "__main__":
    unittest.main()
