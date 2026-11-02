package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.pdf;

import co.edu.unipamplona.ferreteria.domain.model.Dinero;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Escribe un valor monetario en letras para la factura: "veintitrés mil ochocientos pesos con 00/100".
 * Cubre hasta 999.999.999.999 pesos, mas que suficiente para una ferreteria.
 */
final class NumeroALetras {

    private static final String[] UNIDADES = {
            "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
            "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
            "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés",
            "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"
    };

    private static final String[] DECENAS = {
            "", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"
    };

    private static final String[] CENTENAS = {
            "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
            "seiscientos", "setecientos", "ochocientos", "novecientos"
    };

    private NumeroALetras() { }

    static String pesos(Dinero dinero) {
        BigDecimal valor = dinero.valor();
        long enteros = valor.setScale(0, RoundingMode.DOWN).longValueExact();
        int centavos = valor.remainder(BigDecimal.ONE).movePointRight(2).setScale(0, RoundingMode.HALF_UP).intValue();
        if (enteros > 999_999_999_999L) {
            throw new IllegalArgumentException("El valor es demasiado grande para escribirlo en letras");
        }
        String letras = enteros == 0 ? "cero" : apocoparUltima(enLetras(enteros));
        String sufijo = enteros >= 1_000_000 && enteros % 1_000_000 == 0
                ? " de pesos"
                : (enteros == 1 ? " peso" : " pesos");
        return letras + sufijo + " con " + String.format("%02d", centavos) + "/100";
    }

    static String enLetras(long numero) {
        if (numero == 0) {
            return "cero";
        }
        if (numero < 1_000_000) {
            return menoresDeUnMillon(numero, false);
        }
        long millones = numero / 1_000_000;
        long resto = numero % 1_000_000;
        String base = millones == 1
                ? "un millón"
                : menoresDeUnMillon(millones, true) + " millones";
        return resto == 0 ? base : base + " " + menoresDeUnMillon(resto, false);
    }

    private static String menoresDeUnMillon(long numero, boolean apocope) {
        long miles = numero / 1_000;
        long resto = numero % 1_000;
        String texto;
        if (miles == 0) {
            texto = enLetras(resto, apocope);
        } else if (miles == 1) {
            texto = "mil";
        } else {
            texto = enLetras(miles, true) + " mil";
        }
        if (miles > 0 && resto > 0) {
            texto += " " + enLetras(resto, false);
        }
        return texto;
    }

    private static String enLetras(long numero, boolean apocope) {
        if (numero < 30) {
            return apocope ? apocope(UNIDADES[(int) numero]) : UNIDADES[(int) numero];
        }
        if (numero < 100) {
            int decena = (int) (numero / 10);
            int unidad = (int) (numero % 10);
            if (unidad == 0) {
                return DECENAS[decena];
            }
            String ultima = apocope ? apocope(UNIDADES[unidad]) : UNIDADES[unidad];
            return DECENAS[decena] + " y " + ultima;
        }
        if (numero == 100) {
            return "cien";
        }
        int centena = (int) (numero / 100);
        long resto = numero % 100;
        String base = CENTENAS[centena];
        return resto == 0 ? base : base + " " + enLetras(resto, apocope);
    }

    private static String apocoparUltima(String texto) {
        int ultimoEspacio = texto.lastIndexOf(' ');
        return ultimoEspacio < 0
                ? apocope(texto)
                : texto.substring(0, ultimoEspacio + 1) + apocope(texto.substring(ultimoEspacio + 1));
    }

    private static String apocope(String palabra) {
        return switch (palabra) {
            case "uno" -> "un";
            case "veintiuno" -> "veintiún";
            default -> palabra.endsWith("uno")
                    ? palabra.substring(0, palabra.length() - 3) + "ún"
                    : palabra;
        };
    }
}
