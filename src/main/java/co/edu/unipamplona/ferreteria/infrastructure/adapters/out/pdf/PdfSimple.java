package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Escritor PDF 1.4 mínimo, sin librerías externas. Dibuja líneas de texto con Helvetica
 * y WinAnsiEncoding, reparte el contenido en varias páginas y escapa los caracteres
 * especiales de las cadenas PDF.
 */
public final class PdfSimple {

    private static final Charset WIN_ANSI = Charset.forName("windows-1252");
    private static final int LINEAS_POR_PAGINA = 45;
    private static final int MARGEN_X = 50;
    private static final int MARGEN_Y = 800;
    private static final int INTERLINEADO = 14;

    private final List<String> lineas = new ArrayList<>();

    public PdfSimple linea(String texto) {
        lineas.add(texto == null ? "" : texto);
        return this;
    }

    public PdfSimple linea() {
        lineas.add("");
        return this;
    }

    public byte[] construir() {
        List<List<String>> paginas = paginar();
        List<byte[]> objetos = new ArrayList<>();
        int primeraPagina = 4;

        StringBuilder hijos = new StringBuilder();
        for (int i = 0; i < paginas.size(); i++) {
            if (i > 0) {
                hijos.append(' ');
            }
            hijos.append(primeraPagina + 2 * i).append(" 0 R");
        }

        objetos.add(ascii("<< /Type /Catalog /Pages 2 0 R >>"));
        objetos.add(ascii("<< /Type /Pages /Kids [" + hijos + "] /Count " + paginas.size() + " >>"));
        objetos.add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));

        for (int i = 0; i < paginas.size(); i++) {
            int pagina = primeraPagina + 2 * i;
            int contenido = pagina + 1;
            objetos.add(ascii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                    + "/Resources << /Font << /F1 3 0 R >> >> /Contents " + contenido + " 0 R >>"));
            byte[] flujo = flujo(paginas.get(i));
            ByteArrayOutputStream objeto = new ByteArrayOutputStream();
            objeto.writeBytes(ascii("<< /Length " + flujo.length + " >>\nstream\n"));
            objeto.writeBytes(flujo);
            objeto.writeBytes(ascii("\nendstream"));
            objetos.add(objeto.toByteArray());
        }

        return ensamblar(objetos);
    }

    private List<List<String>> paginar() {
        List<List<String>> paginas = new ArrayList<>();
        if (lineas.isEmpty()) {
            paginas.add(List.of(""));
            return paginas;
        }
        for (int i = 0; i < lineas.size(); i += LINEAS_POR_PAGINA) {
            paginas.add(lineas.subList(i, Math.min(i + LINEAS_POR_PAGINA, lineas.size())));
        }
        return paginas;
    }

    private static byte[] flujo(List<String> pag) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(ascii("BT\n/F1 10 Tf\n" + INTERLINEADO + " TL\n" + MARGEN_X + " " + MARGEN_Y + " Td\n"));
        for (String linea : pag) {
            out.writeBytes(ascii("("));
            out.writeBytes(escapar(linea).getBytes(WIN_ANSI));
            out.writeBytes(ascii(") Tj\nT*\n"));
        }
        out.writeBytes(ascii("ET\n"));
        return out.toByteArray();
    }

    private static String escapar(String texto) {
        StringBuilder sb = new StringBuilder(texto.length());
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '(' -> sb.append("\\(");
                case ')' -> sb.append("\\)");
                case '\r' -> {
                }
                case '\n' -> sb.append(' ');
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    private static byte[] ensamblar(List<byte[]> objetos) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(ascii("%PDF-1.4\n"));
        int[] desplazamientos = new int[objetos.size() + 1];
        for (int i = 0; i < objetos.size(); i++) {
            desplazamientos[i + 1] = out.size();
            out.writeBytes(ascii((i + 1) + " 0 obj\n"));
            out.writeBytes(objetos.get(i));
            out.writeBytes(ascii("\nendobj\n"));
        }
        int inicioXref = out.size();
        out.writeBytes(ascii("xref\n0 " + (objetos.size() + 1) + "\n"));
        out.writeBytes(ascii("0000000000 65535 f \n"));
        for (int i = 1; i <= objetos.size(); i++) {
            out.writeBytes(ascii(String.format("%010d 00000 n \n", desplazamientos[i])));
        }
        out.writeBytes(ascii("trailer\n<< /Size " + (objetos.size() + 1) + " /Root 1 0 R >>\n"
                + "startxref\n" + inicioXref + "\n%%EOF"));
        return out.toByteArray();
    }

    private static byte[] ascii(String texto) {
        return texto.getBytes(StandardCharsets.US_ASCII);
    }
}
