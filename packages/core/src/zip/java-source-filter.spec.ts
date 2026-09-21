import { describe, expect, it } from 'vitest';

import { selectJavaSources } from './java-source-filter.js';

describe('selectJavaSources', () => {
  describe('accepts Java sources', () => {
    it('keeps a .java file', () => {
      expect(selectJavaSources(['src/main/java/com/example/Order.java'])).toEqual([
        'src/main/java/com/example/Order.java',
      ]);
    });

    it('keeps sources regardless of project layout', () => {
      // Barista takes a zip from any IDE, so it cannot assume Maven's
      // src/main/java. Eclipse and hand-rolled projects put sources anywhere.
      const paths = [
        'src/Order.java',
        'source/com/example/Customer.java',
        'MyProject/app/Invoice.java',
        'Deep.java',
      ];

      expect(selectJavaSources(paths)).toEqual(paths);
    });

    it('preserves the input order', () => {
      const paths = ['b/Second.java', 'a/First.java', 'c/Third.java'];

      expect(selectJavaSources(paths)).toEqual(paths);
    });

    it('matches the extension case-insensitively', () => {
      // Zips produced on Windows and macOS can carry a case-folded extension.
      expect(selectJavaSources(['src/Order.JAVA', 'src/Customer.Java'])).toEqual([
        'src/Order.JAVA',
        'src/Customer.Java',
      ]);
    });
  });

  describe('rejects everything that is not Java source', () => {
    it('drops compiled output and archives', () => {
      expect(selectJavaSources(['Order.class', 'lib/guava.jar', 'app.war', 'native.so'])).toEqual(
        [],
      );
    });

    it('drops resources that happen to travel with the sources', () => {
      expect(
        selectJavaSources([
          'src/main/resources/logo.png',
          'src/main/resources/application.properties',
          'README.md',
          'pom.xml',
          'build.gradle',
        ]),
      ).toEqual([]);
    });

    it('drops a file whose name merely contains ".java"', () => {
      // `.java.bak` and `Notes.java.txt` are not compilable sources; only the
      // final extension counts.
      expect(selectJavaSources(['Order.java.bak', 'Notes.java.txt'])).toEqual([]);
    });
  });

  describe('rejects build output directories', () => {
    it.each([
      ['Maven', 'target/classes/com/example/Order.java'],
      ['Gradle', 'build/generated/sources/Order.java'],
      ['javac -d out', 'out/production/app/Order.java'],
      ['Eclipse', 'bin/com/example/Order.java'],
      ['version control', '.git/annotated/Order.java'],
      ['node tooling', 'node_modules/some-pkg/Order.java'],
    ])('drops %s output', (_layout, path) => {
      expect(selectJavaSources([path])).toEqual([]);
    });

    it('drops build directories found at any depth', () => {
      expect(selectJavaSources(['modules/api/build/tmp/Order.java'])).toEqual([]);
    });

    it('keeps a directory whose name only starts with a build directory name', () => {
      // The naive `path.includes('build')` check deletes real source trees.
      // `buildings` and `binaries` are ordinary package names.
      const paths = [
        'src/buildings/House.java',
        'src/binaries/Loader.java',
        'src/outbound/Sender.java',
        'src/targeting/Aim.java',
      ];

      expect(selectJavaSources(paths)).toEqual(paths);
    });
  });

  describe('rejects archive metadata', () => {
    it('drops the macOS resource fork directory', () => {
      expect(selectJavaSources(['__MACOSX/src/._Order.java'])).toEqual([]);
    });

    it('drops .DS_Store at any depth', () => {
      expect(selectJavaSources(['.DS_Store', 'src/main/.DS_Store'])).toEqual([]);
    });

    it('drops AppleDouble sidecars sitting next to real sources', () => {
      // macOS stores resource forks in `._`-prefixed files. They normally live
      // under __MACOSX/, but unzipping and re-zipping on another platform
      // leaves them inline beside the source they shadow. They carry a .java
      // extension while being binary, so letting one through hands the parser
      // garbage that looks like a legitimate source file.
      expect(selectJavaSources(['src/._Order.java', 'src/Order.java', '._Customer.java'])).toEqual([
        'src/Order.java',
      ]);
    });
  });

  describe('rejects Java files that declare no type', () => {
    // `package-info.java` carries package annotations and javadoc;
    // `module-info.java` carries the JPMS descriptor. Neither declares a type,
    // so neither can ever contribute a node to a class diagram. Excluding them
    // here keeps every downstream stage from having to special-case a parsed
    // file that yields zero types.
    it('drops package-info.java', () => {
      expect(selectJavaSources(['src/main/java/com/example/package-info.java'])).toEqual([]);
    });

    it('drops module-info.java', () => {
      expect(selectJavaSources(['src/main/java/module-info.java'])).toEqual([]);
    });

    it('keeps a type whose name merely ends in the same words', () => {
      const paths = ['src/PackageInfo.java', 'src/ModuleInfoPanel.java'];

      expect(selectJavaSources(paths)).toEqual(paths);
    });
  });

  describe('edge cases', () => {
    it('returns nothing for no input', () => {
      expect(selectJavaSources([])).toEqual([]);
    });

    it('drops zip directory entries', () => {
      // Most zip writers emit an entry per directory, terminated with a slash.
      expect(selectJavaSources(['src/main/java/', 'src/'])).toEqual([]);
    });

    it('drops a file with no extension', () => {
      expect(selectJavaSources(['LICENSE', 'Makefile'])).toEqual([]);
    });

    it('filters a realistic mixed project down to its sources', () => {
      const selected = selectJavaSources([
        '__MACOSX/',
        'demo/',
        'demo/pom.xml',
        'demo/.DS_Store',
        'demo/src/main/java/com/example/App.java',
        'demo/src/main/java/com/example/package-info.java',
        'demo/src/main/java/com/example/model/Order.java',
        'demo/src/main/resources/application.yml',
        'demo/src/test/java/com/example/AppTest.java',
        'demo/target/classes/com/example/App.class',
        'demo/target/generated-sources/Stub.java',
      ]);

      expect(selected).toEqual([
        'demo/src/main/java/com/example/App.java',
        'demo/src/main/java/com/example/model/Order.java',
        'demo/src/test/java/com/example/AppTest.java',
      ]);
    });
  });
});
