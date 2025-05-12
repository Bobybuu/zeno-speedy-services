# Base class
class Book:
    def __init__(self, title, author, pages, genre):
        self.title = title
        self.author = author
        self._pages = pages  # Encapsulated (use _ to hint "protected")
        self.genre = genre

    def describe(self):
        print(f"'{self.title}' by {self.author} - {self.genre}, {self._pages} pages")

    def read(self):
        print(f"You're reading '{self.title}' 📖")

# Subclass with inheritance
class ComicBook(Book):
    def __init__(self, title, author, pages, genre, artist):
        super().__init__(title, author, pages, genre)
        self.artist = artist

    def describe(self):
        # Polymorphism: overrides parent method
        print(f"Comic: '{self.title}' by {self.author}, art by {self.artist} 🎨")

# Create objects
normal_book = Book("Python Basics", "John Doe", 300, "Education")
comic = ComicBook("Spider-Man", "Stan Lee", 50, "Action", "Steve Ditko")

normal_book.describe()
normal_book.read()

comic.describe()
comic.read()
